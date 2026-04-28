import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

export async function GET() {
  const seller = await requireSellerSession();
  if ("error" in seller) {
    return NextResponse.json({ success: false, error: seller.error }, { status: seller.status });
  }

  const sellerId = seller.session.userId!;

  const [
    wallet,
    selectedProducts,
    successfulOrdersAgg,
    recentOrders,
    pendingWithdrawals,
    withdrawals,
  ] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: sellerId },
      select: { balance: true, updatedAt: true },
    }),
    prisma.sellerProduct.count({
      where: { sellerId, isActive: true },
    }),
    prisma.order.aggregate({
      where: { sellerId, status: "SUCCESS" },
      _count: true,
      _sum: { sellerCommission: true },
    }),
    prisma.order.findMany({
      where: { sellerId, status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        product: {
          select: { id: true, name: true, brand: true },
        },
      },
    }),
    prisma.sellerWithdrawalRequest.aggregate({
      where: {
        userId: sellerId,
        status: "PENDING",
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sellerWithdrawalRequest.findMany({
      where: { userId: sellerId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      seller: {
        id: seller.sellerProfile.id,
        slug: seller.sellerProfile.slug,
        displayName: seller.sellerProfile.displayName,
        isActive: seller.sellerProfile.isActive,
      },
      summary: {
        walletBalance: Number(wallet?.balance ?? 0),
        selectedProducts,
        successfulOrders: successfulOrdersAgg._count,
        totalCommission: Number(successfulOrdersAgg._sum.sellerCommission ?? 0),
        pendingWithdrawalAmount: Number(pendingWithdrawals._sum.amount ?? 0),
        pendingWithdrawalCount: pendingWithdrawals._count,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        amount: Number(order.amount),
        sellerCommission: Number(order.sellerCommission),
        createdAt: order.createdAt,
        product: order.product,
      })),
      withdrawals: withdrawals.map((item) => ({
        ...item,
        amount: Number(item.amount),
      })),
    },
  });
}
