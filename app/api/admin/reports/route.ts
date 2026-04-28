import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30"; // days: 7 | 30 | 90 | custom
  const from = searchParams.get("from");
  const to   = searchParams.get("to");

  let startDate: Date;
  let endDate: Date = new Date();

  if (from && to) {
    startDate = new Date(from);
    endDate   = new Date(to);
    endDate.setHours(23, 59, 59, 999);
  } else {
    const days = parseInt(range, 10) || 30;
    startDate  = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);
  }

  const dateFilter = { gte: startDate, lte: endDate };

  // ── 1. Summary stats ──────────────────────────────────────────────────────
  const [totalOrders, successOrders, failedOrders, pendingOrders] = await Promise.all([
    prisma.order.count({ where: { createdAt: dateFilter } }),
    prisma.order.count({ where: { createdAt: dateFilter, status: "SUCCESS" } }),
    prisma.order.count({ where: { createdAt: dateFilter, status: { in: ["FAILED", "EXPIRED", "REFUNDED"] } } }),
    prisma.order.count({ where: { createdAt: dateFilter, status: { in: ["CREATED", "WAITING_PAYMENT", "PAID", "PROCESSING_PROVIDER"] } } }),
  ]);

  // Revenue (from SUCCESS orders only) and discount
  const revenueAgg = await prisma.order.aggregate({
    where: { createdAt: dateFilter, status: "SUCCESS" },
    _sum: { amount: true, discount: true, markup: true, fee: true },
  });
  const totalRevenue   = Number(revenueAgg._sum.amount   ?? 0);
  const totalDiscount  = Number(revenueAgg._sum.discount  ?? 0);
  const totalMarkup    = Number(revenueAgg._sum.markup    ?? 0);
  const totalFee       = Number(revenueAgg._sum.fee       ?? 0);

  // ── 2. Revenue by payment method ─────────────────────────────────────────
  const byPaymentRaw = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: { createdAt: dateFilter, status: "SUCCESS" },
    _sum: { amount: true },
    _count: { id: true },
  });
  const byPaymentMethod = byPaymentRaw.map((r: { paymentMethod: string; _sum: { amount: unknown }; _count: { id: number } }) => ({
    method: r.paymentMethod,
    revenue: Number(r._sum.amount ?? 0),
    count: r._count.id,
  }));

  // ── 3. Revenue by product category ───────────────────────────────────────
  const byCategoryRaw = await prisma.order.findMany({
    where: { createdAt: dateFilter, status: "SUCCESS" },
    select: {
      amount: true,
      product: { select: { category: true } },
    },
  });
  const categoryMap: Record<string, { revenue: number; count: number }> = {};
  for (const o of byCategoryRaw) {
    const cat = o.product.category;
    if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, count: 0 };
    categoryMap[cat].revenue += Number(o.amount);
    categoryMap[cat].count   += 1;
  }
  const byCategory = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── 4. Top brands ─────────────────────────────────────────────────────────
  const byBrandRaw = await prisma.order.findMany({
    where: { createdAt: dateFilter, status: "SUCCESS" },
    select: {
      amount: true,
      product: { select: { brand: true } },
    },
  });
  const brandMap: Record<string, { revenue: number; count: number }> = {};
  for (const o of byBrandRaw) {
    const brand = o.product.brand;
    if (!brandMap[brand]) brandMap[brand] = { revenue: 0, count: 0 };
    brandMap[brand].revenue += Number(o.amount);
    brandMap[brand].count   += 1;
  }
  const topBrands = Object.entries(brandMap)
    .map(([brand, v]) => ({ brand, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // ── 5. Daily revenue (last N days depending on range) ────────────────────
  const allOrders = await prisma.order.findMany({
    where: { createdAt: dateFilter, status: "SUCCESS" },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap: Record<string, { revenue: number; count: number }> = {};
  for (const o of allOrders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, count: 0 };
    dailyMap[day].revenue += Number(o.amount);
    dailyMap[day].count   += 1;
  }

  // Fill in missing days with 0
  const dailyRevenue: { date: string; revenue: number; count: number }[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const day = cursor.toISOString().slice(0, 10);
    dailyRevenue.push({ date: day, ...(dailyMap[day] ?? { revenue: 0, count: 0 }) });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── 6. New members in range (exclude ADMIN) ──────────────────────────────
  const newMembers = await prisma.user.count({ where: { createdAt: dateFilter, role: "MEMBER" } });

  // ── 7. Wallet vs gateway revenue ─────────────────────────────────────────
  const topupAgg = await prisma.walletTopup.aggregate({
    where: { createdAt: dateFilter, status: "COMPLETED" },
    _sum: { amount: true },
    _count: { id: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      summary: {
        totalOrders,
        successOrders,
        failedOrders,
        pendingOrders,
        totalRevenue,
        totalDiscount,
        totalMarkup,
        totalFee,
        newMembers,
        successRate: totalOrders > 0 ? Math.round((successOrders / totalOrders) * 100) : 0,
      },
      byPaymentMethod,
      byCategory,
      topBrands,
      dailyRevenue,
      topup: {
        totalAmount: Number(topupAgg._sum.amount ?? 0),
        count: topupAgg._count.id,
      },
    },
  });
}
