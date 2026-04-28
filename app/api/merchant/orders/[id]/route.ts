import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const merchant = await requireSellerSession();
  if ("error" in merchant) {
    return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
  }

  const { id } = await context.params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      sellerId: merchant.session.userId!,
    },
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
        orderBy: { createdAt: "desc" },
      },
      sellerProduct: {
        select: {
          id: true,
          sellingPrice: true,
          feeType: true,
          feeValue: true,
          commissionType: true,
          commissionValue: true,
          isActive: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "Order merchant tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: order.id,
      orderCode: order.orderCode,
      targetNumber: order.targetNumber,
      targetData: order.targetData,
      amount: Number(order.amount),
      basePrice: Number(order.basePrice),
      markup: Number(order.markup),
      fee: Number(order.fee),
      discount: Number(order.discount),
      sellerGrossProfit: Number(order.sellerGrossProfit),
      sellerFeeAmount: Number(order.sellerFeeAmount),
      sellerCommission: Number(order.sellerCommission),
      status: order.status,
      paymentMethod: order.paymentMethod,
      provider: order.provider,
      providerRef: order.providerRef,
      serialNumber: order.serialNumber,
      notes: order.notes,
      sellerCommissionCreditedAt: order.sellerCommissionCreditedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user,
      product: order.product
        ? {
            ...order.product,
            providerPrice: Number(order.product.providerPrice),
            margin: Number(order.product.margin),
            sellingPrice: Number(order.product.sellingPrice),
          }
        : null,
      paymentInvoice: order.paymentInvoice
        ? {
            ...order.paymentInvoice,
            amount: Number(order.paymentInvoice.amount),
          }
        : null,
      sellerProduct: order.sellerProduct
        ? {
            ...order.sellerProduct,
            sellingPrice: order.sellerProduct.sellingPrice !== null ? Number(order.sellerProduct.sellingPrice) : null,
            feeValue: Number(order.sellerProduct.feeValue),
            commissionValue: Number(order.sellerProduct.commissionValue),
          }
        : null,
      providerLogs: order.providerLogs,
    },
  });
}
