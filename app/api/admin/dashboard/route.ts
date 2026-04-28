import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";


function deltaStr(today: number, yesterday: number): { delta: string; tone: "good" | "bad" } {
  if (yesterday === 0) return { delta: today > 0 ? "+100%" : "0%", tone: "good" };
  const pct = ((today - yesterday) / yesterday) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { delta: `${sign}${pct.toFixed(1)}%`, tone: pct >= 0 ? "good" : "bad" };
}

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── Date ranges ────────────────────────────────────────────────────────────
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd   = new Date(todayEnd);   yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  // ── 1. Stats cards ─────────────────────────────────────────────────────────
  const [
    ordersToday,
    ordersYesterday,
    successToday,
    successYesterday,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.order.count({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),
    prisma.order.count({ where: { status: "SUCCESS", createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.order.count({ where: { status: "SUCCESS", createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),
  ]);

  const [revenueToday, revenueYesterday] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { amount: true },
    }),
  ]);

  const revToday = Number(revenueToday._sum.amount ?? 0);
  const revYest  = Number(revenueYesterday._sum.amount ?? 0);

  function formatRp(n: number) {
    if (n >= 1000000000) return `Rp ${(n / 1000000000).toFixed(1)}M`;
    if (n >= 1000000)    return `Rp ${(n / 1000000).toFixed(1)}jt`;
    if (n >= 1000)       return `Rp ${(n / 1000).toFixed(0)}rb`;
    return `Rp ${n}`;
  }

  const stats = [
    {
      label: "Order Hari Ini",
      value: ordersToday.toLocaleString("id-ID"),
      ...deltaStr(ordersToday, ordersYesterday),
    },
    {
      label: "Transaksi Sukses",
      value: successToday.toLocaleString("id-ID"),
      ...deltaStr(successToday, successYesterday),
    },
    {
      label: "Pendapatan",
      value: formatRp(revToday),
      ...deltaStr(revToday, revYest),
    },
  ];

  // ── 2. Revenue chart — last 5 months wallet vs gateway ────────────────────
  // Build month boundaries (current month + 4 previous)
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleDateString("id-ID", { month: "short" });
    months.push({ label, start, end });
  }

  const monthlyData = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const [walletAgg, gatewayAgg] = await Promise.all([
        prisma.order.aggregate({
          where: { status: "SUCCESS", paymentMethod: "WALLET", createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.order.aggregate({
          where: { status: "SUCCESS", paymentMethod: { not: "WALLET" }, createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      return {
        label,
        walletRaw:  Number(walletAgg._sum.amount  ?? 0),
        gatewayRaw: Number(gatewayAgg._sum.amount ?? 0),
      };
    })
  );

  // Normalize to 0–100 for the chart bars; include raw IDR for tooltips
  const maxVal = Math.max(...monthlyData.map((m) => Math.max(m.walletRaw, m.gatewayRaw)), 1);
  const revenue = monthlyData.map(({ label, walletRaw, gatewayRaw }) => ({
    label,
    wallet:     Math.round((walletRaw  / maxVal) * 100),
    gateway:    Math.round((gatewayRaw / maxVal) * 100),
    walletRaw,
    gatewayRaw,
  }));

  return NextResponse.json({ success: true, data: { stats, revenue } });
}
