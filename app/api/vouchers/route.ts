/**
 * GET /api/vouchers  — list vouchers + claimed status for current user
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    const userId = session.isLoggedIn ? session.userId : null;

    // Get all active, valid vouchers
    const now = new Date();
    const vouchers = await prisma.voucher.findMany({
      where: {
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
    });

    // Get user's claims if logged in
    let userClaims: Record<string, string> = {};
    if (userId) {
      const claims = await prisma.voucherClaim.findMany({
        where: { userId },
        select: { voucherId: true, status: true },
      });
      claims.forEach((c) => { userClaims[c.voucherId] = c.status; });
    }

    const result = vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      title: v.title,
      description: v.description,
      discountType: v.discountType,
      discountValue: Number(v.discountValue),
      maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : null,
      minPurchase: Number(v.minPurchase),
      quota: v.quota,
      usedCount: v.usedCount,
      perUserLimit: v.perUserLimit,
      startDate: v.startDate,
      endDate: v.endDate,
      claimStatus: userId ? (userClaims[v.id] ?? null) : null,
      isFull: v.quota !== null && v.usedCount >= v.quota,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GET /api/vouchers]", err);
    return NextResponse.json({ success: false, error: "Gagal memuat voucher." }, { status: 500 });
  }
}
