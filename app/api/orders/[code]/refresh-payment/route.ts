import crypto from "crypto";
import { NextResponse } from "next/server";
import { InvoiceStatus, OrderStatus, PaymentMethod } from "@/src/core/domain/enums/order.enum";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { PoppayAdapter } from "@/src/infra/payment/poppay/poppay.adapter";
import { isPoppayConfigured } from "@/src/infra/payment/poppay/poppay.client";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const orderRepo = new OrderRepository();

function isInvoiceExpired(expiredAt: Date | string | null | undefined): boolean {
  if (!expiredAt) return false;
  return new Date(expiredAt).getTime() <= Date.now();
}

function buildReissuedOrderRef(orderCode: string): string {
  return `${orderCode}__R${Date.now()}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get("token");

    const order = await orderRepo.findByCode(code);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const session = await getSession();
    const sessionUserId = session.isLoggedIn ? session.userId : null;

    if (order.userId) {
      if (session.role !== "ADMIN" && sessionUserId !== order.userId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (!rawToken) {
        return NextResponse.json(
          { success: false, error: "Access token required for guest orders" },
          { status: 401 }
        );
      }

      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      if (!order.viewTokenHash || order.viewTokenHash !== tokenHash) {
        return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });
      }
    }

    if (order.paymentMethod !== PaymentMethod.PAYMENT_GATEWAY) {
      return NextResponse.json(
        { success: false, error: "Pesanan ini tidak menggunakan payment gateway." },
        { status: 400 }
      );
    }

    if (!order.paymentInvoice) {
      return NextResponse.json(
        { success: false, error: "Invoice pembayaran tidak ditemukan." },
        { status: 404 }
      );
    }

    const invoiceExpired =
      (order.paymentInvoice.status === InvoiceStatus.EXPIRED ||
        order.paymentInvoice.status === InvoiceStatus.PENDING) &&
      isInvoiceExpired(order.paymentInvoice.expiredAt);

    const orderReissuable = order.status === OrderStatus.WAITING_PAYMENT;
    const hasNeverBeenPaid = !order.paymentInvoice.paidAt;

    if (!invoiceExpired || !orderReissuable || !hasNeverBeenPaid) {
      return NextResponse.json(
        { success: false, error: "QRIS baru hanya bisa diminta untuk pesanan menunggu pembayaran yang sudah kedaluwarsa dan belum pernah dibayar." },
        { status: 400 }
      );
    }

    if (!(await isPoppayConfigured())) {
      return NextResponse.json(
        { success: false, error: "Poppay belum terkonfigurasi lengkap." },
        { status: 400 }
      );
    }

    const paymentGateway = new PoppayAdapter();
    const payer = order.userId
      ? await prisma.user.findUnique({
          where: { id: order.userId },
          select: { name: true, email: true },
        })
      : null;

    const payableAmount = Math.max(1, Number(order.amount) - Number(order.fee));

    const paymentResult = await paymentGateway.createPayment({
      orderId: buildReissuedOrderRef(order.orderCode),
      amount: payableAmount,
      method: order.paymentInvoice.method ?? undefined,
      description: `${order.product.name} — ${order.targetNumber}`,
      payerName: payer?.name?.trim() || order.whatsapp?.trim() || order.targetNumber,
      payerEmail: payer?.email?.trim() || undefined,
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.WAITING_PAYMENT,
          fee: paymentResult.fee,
          amount: paymentResult.totalPayment,
          notes: "QRIS diperbarui atas permintaan user.",
        },
      });

      await tx.paymentInvoice.update({
        where: { id: order.paymentInvoice!.id },
        data: {
          invoiceId: paymentResult.invoiceId,
          gatewayName: paymentGateway.gatewayName,
          amount: paymentResult.amount,
          fee: paymentResult.fee,
          totalPayment: paymentResult.totalPayment,
          method: paymentResult.method ?? order.paymentInvoice!.method,
          paymentNumber: paymentResult.paymentNumber ?? null,
          paymentUrl: paymentResult.paymentUrl ?? null,
          status: InvoiceStatus.PENDING,
          rawPayload: paymentResult.raw as never,
          expiredAt: paymentResult.expiredAt ?? null,
          paidAt: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        orderCode: order.orderCode,
        invoiceId: paymentResult.invoiceId,
        expiredAt: paymentResult.expiredAt ?? null,
      },
    });
  } catch (error) {
    console.error("[POST /api/orders/[code]/refresh-payment]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
