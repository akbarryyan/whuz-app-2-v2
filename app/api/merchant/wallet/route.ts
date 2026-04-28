import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

export async function GET() {
  const merchant = await requireSellerSession();
  if ("error" in merchant) {
    return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
  }

  const merchantId = merchant.session.userId!;

  const [wallet, aggregates] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: merchantId },
      select: { id: true, balance: true, updatedAt: true },
    }),
    prisma.order.aggregate({
      where: {
        sellerId: merchantId,
        status: "SUCCESS",
      },
      _sum: {
        sellerGrossProfit: true,
        sellerFeeAmount: true,
        sellerCommission: true,
      },
      _count: true,
    }),
  ]);

  const ledger = wallet
    ? await prisma.ledgerEntry.findMany({
        where: {
          walletId: wallet.id,
          type: {
            in: ["COMMISSION", "WITHDRAW_HOLD", "WITHDRAW_RELEASE", "WITHDRAW_PAID"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return NextResponse.json({
    success: true,
    data: {
      balance: Number(wallet?.balance ?? 0),
      updatedAt: wallet?.updatedAt ?? null,
      totalSalesCredits: Number(aggregates._sum.sellerCommission ?? 0),
      totalFeeDeductions: Number(aggregates._sum.sellerFeeAmount ?? 0),
      totalGrossMargin: Number(aggregates._sum.sellerGrossProfit ?? 0),
      totalSuccessfulOrders: aggregates._count,
      ledger: ledger.map((item) => ({
        id: item.id,
        type: item.type,
        amount: Number(item.amount),
        balanceBefore: Number(item.balanceBefore),
        balanceAfter: Number(item.balanceAfter),
        reference: item.reference,
        description: item.description,
        createdAt: item.createdAt,
      })),
    },
  });
}
