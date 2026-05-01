import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { OrderStatus } from "@/src/core/domain/enums/order.enum";
import { checkAndUpgradeUserTier } from "@/lib/pricing";

export const dynamic = "force-dynamic";
const orderRepo = new OrderRepository();

/**
 * GET /api/admin/transactions/[id]
 * Get single transaction detail with provider logs
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction ID is required",
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            brand: true,
            type: true,
            provider: true,
            providerCode: true,
            providerPrice: true,
            margin: true,
            sellingPrice: true,
          },
        },
        paymentInvoice: true,
        providerLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction not found",
        },
        { status: 404 }
      );
    }

    // Convert Decimal to number
    const orderData = {
      id: order.id,
      orderCode: order.orderCode,
      userId: order.userId,
      user: order.user,
      product: order.product ? {
        ...order.product,
        providerPrice: Number(order.product.providerPrice),
        margin: Number(order.product.margin),
        sellingPrice: Number(order.product.sellingPrice),
      } : null,
      targetNumber: order.targetNumber,
      targetData: order.targetData,
      amount: Number(order.amount),
      status: order.status,
      paymentMethod: order.paymentMethod,
      serialNumber: order.serialNumber,
      providerRef: order.providerRef,
      notes: order.notes,
      paymentInvoice: order.paymentInvoice ? {
        ...order.paymentInvoice,
        amount: Number(order.paymentInvoice.amount),
        paidAt: order.paymentInvoice.paidAt?.toISOString() || null,
        expiredAt: order.paymentInvoice.expiredAt?.toISOString() || null,
        createdAt: order.paymentInvoice.createdAt.toISOString(),
        updatedAt: order.paymentInvoice.updatedAt.toISOString(),
      } : null,
      providerLogs: order.providerLogs.map((log) => ({
        id: log.id,
        provider: log.provider,
        action: log.action,
        request: log.request,
        response: log.response,
        success: log.success,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: orderData,
    });
  } catch (error) {
    console.error("Failed to get transaction detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transaction detail",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/transactions/[id]
 * Manual completion for MANUAL provider orders.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const nextStatus = String(body.status ?? "").trim() as OrderStatus;
    const serialNumber = String(body.serialNumber ?? "").trim();
    const notes = String(body.notes ?? "").trim();

    if (![OrderStatus.SUCCESS, OrderStatus.FAILED].includes(nextStatus)) {
      return NextResponse.json({ success: false, error: "Status hanya boleh SUCCESS atau FAILED." }, { status: 400 });
    }

    const order = await orderRepo.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }
    if (order.product.provider !== "MANUAL") {
      return NextResponse.json({ success: false, error: "Hanya transaksi produk manual yang bisa diproses manual." }, { status: 400 });
    }
    if (![OrderStatus.PAID, OrderStatus.PROCESSING_PROVIDER].includes(order.status as OrderStatus)) {
      return NextResponse.json({ success: false, error: "Transaksi belum siap diproses manual atau sudah final." }, { status: 400 });
    }

    if (nextStatus === OrderStatus.SUCCESS) {
      await orderRepo.updateStatus(order.id, OrderStatus.SUCCESS, {
        serialNumber: serialNumber || undefined,
        providerRef: order.providerRef ?? `MANUAL-${order.orderCode}`,
        notes: notes || "Transaksi manual diselesaikan admin.",
      });
      await orderRepo.creditSellerCommission(order.id);
      if (order.paymentMethod === "WALLET" && order.userId) {
        await orderRepo.finalizeDebitLedger(order.userId, Number(order.amount), order.id);
      }
      if (order.userId) {
        await checkAndUpgradeUserTier(order.userId);
      }
    } else {
      if (order.paymentMethod === "WALLET" && order.userId) {
        await orderRepo.releaseWalletHold(order.userId, Number(order.amount), order.id);
        await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
          notes: notes || "Transaksi manual digagalkan admin. Saldo dikembalikan.",
        });
      } else if (order.paymentMethod === "PAYMENT_GATEWAY" && order.userId) {
        await orderRepo.refundPaidOrderToWallet(order.userId, Number(order.amount), order.id);
        await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
          notes: notes || "Transaksi manual digagalkan admin. Dana dikembalikan ke saldo akun.",
        });
      } else {
        await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
          notes: notes || "Transaksi manual digagalkan admin. Refund perlu diproses manual.",
        });
      }
    }

    await orderRepo.logProviderAction({
      orderId: order.id,
      provider: "MANUAL",
      action: nextStatus === OrderStatus.SUCCESS ? "manual:success" : "manual:failed",
      response: {
        status: nextStatus,
        serialNumber: serialNumber || null,
        notes: notes || null,
      },
      success: nextStatus === OrderStatus.SUCCESS,
      errorMessage: nextStatus === OrderStatus.FAILED ? notes || "Manual failure" : undefined,
    });

    const updated = await orderRepo.findById(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update manual transaction:", error);
    return NextResponse.json({ success: false, error: "Gagal memproses transaksi manual." }, { status: 500 });
  }
}
