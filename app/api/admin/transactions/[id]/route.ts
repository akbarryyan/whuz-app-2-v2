import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

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
