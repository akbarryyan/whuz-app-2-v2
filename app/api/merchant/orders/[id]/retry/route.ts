import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { ExecuteProviderPurchaseService } from "@/src/core/services/provider/execute-provider-purchase.service";
import { OrderStatus } from "@/src/core/domain/enums/order.enum";

export const dynamic = "force-dynamic";

const executeService = new ExecuteProviderPurchaseService(new OrderRepository());

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const merchant = await requireSellerSession();
  if ("error" in merchant) {
    return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      sellerId: merchant.session.userId!,
    },
    include: {
      paymentInvoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "Order merchant tidak ditemukan" }, { status: 404 });
  }

  if (order.status !== "FAILED") {
    return NextResponse.json({ success: false, error: "Hanya order gagal yang bisa di-retry" }, { status: 422 });
  }

  if (order.paymentMethod !== "PAYMENT_GATEWAY" || order.paymentInvoice?.status !== "PAID") {
    return NextResponse.json({
      success: false,
      error: "Retry merchant hanya diizinkan untuk order gateway yang sudah dibayar",
    }, { status: 422 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAID,
      providerRef: null,
      serialNumber: null,
      notes: "Retry by merchant",
    },
  });

  await executeService.execute(order.id);

  const refreshed = await prisma.order.findUnique({
    where: { id: order.id },
    select: {
      id: true,
      orderCode: true,
      status: true,
      notes: true,
      providerRef: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: refreshed });
}
