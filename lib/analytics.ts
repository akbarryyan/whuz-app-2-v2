import { prisma } from "@/src/infra/db/prisma";

export function getJakartaDayKey(date = new Date()) {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

export async function getFooterVisitorStats() {
  const today = getJakartaDayKey();

  try {
    const [totalVisitorsRows, todayMetricsRows] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) AS count
        FROM site_visitors
      `,
      prisma.$queryRaw<Array<{ uniqueVisitors: number; pageViews: number }>>`
        SELECT uniqueVisitors, pageViews
        FROM site_daily_metrics
        WHERE date = ${today}
        LIMIT 1
      `,
    ]);

    const totalVisitors = Number(totalVisitorsRows[0]?.count ?? 0);
    const todayMetrics = todayMetricsRows[0];

    return {
      visitorsToday: todayMetrics?.uniqueVisitors ?? 0,
      totalVisits: totalVisitors,
      pagesToday: todayMetrics?.pageViews ?? 0,
    };
  } catch {
    return {
      visitorsToday: 0,
      totalVisits: 0,
      pagesToday: 0,
    };
  }
}
