import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";
import { InvoiceStatus, OrderStatus } from "@/src/core/domain/enums/order.enum";

const EXPIRE_NOTE = "Pembayaran kedaluwarsa otomatis karena melewati batas waktu QRIS.";
const FALLBACK_EXPIRY_WINDOW_MS = 30 * 60 * 1000;

async function expireOrdersByIds(orderIds: string[]) {
  if (orderIds.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    await tx.paymentInvoice.updateMany({
      where: {
        orderId: { in: orderIds },
        status: InvoiceStatus.PENDING,
        paidAt: null,
      },
      data: {
        status: InvoiceStatus.EXPIRED,
      },
    });

    await tx.order.updateMany({
      where: {
        id: { in: orderIds },
        status: OrderStatus.WAITING_PAYMENT,
      },
      data: {
        status: OrderStatus.EXPIRED,
        notes: EXPIRE_NOTE,
      },
    });
  });

  return orderIds.length;
}

function buildExpiredOrderWhereClause(): Prisma.OrderWhereInput {
  const now = new Date();
  const fallbackExpiryDate = new Date(now.getTime() - FALLBACK_EXPIRY_WINDOW_MS);

  return {
    status: OrderStatus.WAITING_PAYMENT,
    OR: [
      {
        paymentInvoice: {
          is: {
            status: InvoiceStatus.PENDING,
            paidAt: null,
            expiredAt: { lt: now },
          },
        },
      },
      {
        paymentInvoice: {
          is: {
            status: InvoiceStatus.EXPIRED,
            paidAt: null,
          },
        },
      },
      {
        paymentInvoice: {
          is: {
            status: InvoiceStatus.CANCELLED,
            paidAt: null,
          },
        },
      },
      {
        paymentInvoice: null,
        createdAt: { lt: fallbackExpiryDate },
      },
    ],
  };
}

export async function syncExpiredOrdersForUser(userId: string) {
  const expiredOrders = await prisma.order.findMany({
    where: {
      userId,
      ...buildExpiredOrderWhereClause(),
    },
    select: { id: true },
  });

  return expireOrdersByIds(expiredOrders.map((order) => order.id));
}

export async function syncExpiredOrderByCode(orderCode: string) {
  const expiredOrder = await prisma.order.findFirst({
    where: {
      orderCode,
      ...buildExpiredOrderWhereClause(),
    },
    select: { id: true },
  });

  if (!expiredOrder) return 0;
  return expireOrdersByIds([expiredOrder.id]);
}
