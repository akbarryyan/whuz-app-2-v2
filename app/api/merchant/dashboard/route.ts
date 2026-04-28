import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const merchant = await requireSellerSession();
    if ("error" in merchant) {
      return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
    }

    const merchantId = merchant.session.userId!;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayLabels = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });

    const [wallet, totals, dailySales, recentOrders, weeklyOrders] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: merchantId },
        select: { balance: true, updatedAt: true },
      }),
      prisma.order.aggregate({
        where: { sellerId: merchantId, status: "SUCCESS" },
        _count: true,
        _sum: {
          amount: true,
          sellerGrossProfit: true,
          sellerFeeAmount: true,
          sellerCommission: true,
        },
      }),
      prisma.order.aggregate({
        where: {
          sellerId: merchantId,
          status: "SUCCESS",
          createdAt: { gte: startOfDay },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.order.findMany({
        where: {
          sellerId: merchantId,
          status: "SUCCESS",
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          product: {
            select: { name: true, brand: true },
          },
          user: {
            select: { name: true, phone: true, email: true },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          sellerId: merchantId,
          status: "SUCCESS",
          createdAt: { gte: dayLabels[0] },
        },
        select: {
          amount: true,
          sellerCommission: true,
          createdAt: true,
        },
      }),
    ]);

    const revenue = dayLabels.map((date) => {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const rows = weeklyOrders.filter(
        (order) => order.createdAt >= date && order.createdAt < nextDate
      );

      const omzet = rows.reduce((sum, row) => sum + Number(row.amount), 0);
      const komisi = rows.reduce((sum, row) => sum + Number(row.sellerCommission), 0);

      return {
        label: new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          timeZone: "Asia/Jakarta",
        }).format(date),
        omzet,
        komisi,
      };
    });

    const maxRevenue = Math.max(...revenue.map((item) => item.omzet), 1);

    return NextResponse.json({
      success: true,
      data: {
        merchant: {
          id: merchant.sellerProfile.id,
          slug: merchant.sellerProfile.slug,
          displayName: merchant.sellerProfile.displayName,
          description: merchant.sellerProfile.description,
          profileImageUrl: merchant.sellerProfile.profileImageUrl,
        },
        summary: {
          saldo: Number(wallet?.balance ?? 0),
          totalTransaksi: totals._count,
          omzetHarian: Number(dailySales._sum.amount ?? 0),
          transaksiHarian: dailySales._count,
          totalOmzet: Number(totals._sum.amount ?? 0),
          totalMarginKotor: Number(totals._sum.sellerGrossProfit ?? 0),
          totalFee: Number(totals._sum.sellerFeeAmount ?? 0),
          totalSaldoMasuk: Number(totals._sum.sellerCommission ?? 0),
        },
        revenue: revenue.map((item) => ({
          ...item,
          omzetBar: Math.max(8, Math.round((item.omzet / maxRevenue) * 100)),
        })),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          orderCode: order.orderCode,
          amount: Number(order.amount),
          sellerCommission: Number(order.sellerCommission),
          createdAt: order.createdAt,
          productName: order.product.name,
          brand: order.product.brand,
          customerName:
            order.user?.name || order.user?.phone || order.user?.email || "Guest",
        })),
      },
    });
  } catch (error) {
    console.error("[MERCHANT DASHBOARD ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat dashboard merchant." },
      { status: 500 }
    );
  }
}
