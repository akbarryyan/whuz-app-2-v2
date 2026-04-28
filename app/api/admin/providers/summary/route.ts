import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers/summary
 * Returns per-provider stats (balance, latency, success rate) + 24h totals.
 * Used by the ProviderStatus dashboard widget.
 */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || session.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // ── Settings (balance cache, isActive) ────────────────────────────────────
  const settings = await prisma.providerSetting.findMany();

  // ── Last 10 logs per provider (latency average + success rate) ────────────
  const PROVIDERS = ["DIGIFLAZZ", "VIP_RESELLER"];

  const providerStats = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const [recentLogs, logs24h, lastError] = await Promise.all([
        // Last 10 for avg latency
        prisma.providerLog.findMany({
          where: { provider },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { latency: true, success: true },
        }),
        // All 24h for success rate + total count
        prisma.providerLog.findMany({
          where: { provider, createdAt: { gte: since24h } },
          select: { success: true },
        }),
        // Most recent failure
        prisma.providerLog.findFirst({
          where: { provider, success: false },
          orderBy: { createdAt: "desc" },
          select: { errorMessage: true, action: true, createdAt: true },
        }),
      ]);

      const setting = settings.find((s) => s.provider === provider);
      const avgLatency = recentLogs.length
        ? Math.round(recentLogs.reduce((s, l) => s + l.latency, 0) / recentLogs.length)
        : null;
      const successRate = logs24h.length
        ? Math.round((logs24h.filter((l) => l.success).length / logs24h.length) * 100)
        : null;

      return {
        provider,
        isActive:     setting?.isActive ?? false,
        balance:      setting?.lastBalance     != null ? Number(setting.lastBalance) : null,
        balanceAt:    setting?.lastBalanceAt?.toISOString() ?? null,
        avgLatency,
        successRate,
        requests24h:  logs24h.length,
        lastError:    lastError
          ? {
              action:  lastError.action,
              message: lastError.errorMessage ?? "Unknown error",
              at:      lastError.createdAt.toISOString(),
            }
          : null,
      };
    })
  );

  // ── 24h totals across all providers ──────────────────────────────────────
  const [total24h, failed24h] = await Promise.all([
    prisma.providerLog.count({ where: { createdAt: { gte: since24h } } }),
    prisma.providerLog.count({ where: { createdAt: { gte: since24h }, success: false } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      providers:   providerStats,
      total24h,
      failed24h,
      successRate: total24h > 0 ? Math.round(((total24h - failed24h) / total24h) * 100) : null,
    },
  });
}
