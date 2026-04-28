/**
 * GET /api/vouchers/validate?code=XXX&amount=50000
 * Validate a voucher code and return discount details without claiming it.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const amount = Number(searchParams.get("amount") ?? 0);

  if (!code) {
    return NextResponse.json({ success: false, error: "Kode voucher diperlukan" }, { status: 400 });
  }

  // Get session (optional — guest can still validate, just can't track per-user limit)
  const session = await getSession();
  const userId = session.isLoggedIn && session.userId ? session.userId : null;

  try {
    const voucher = await prisma.voucher.findUnique({ where: { code } });

    if (!voucher) {
      return NextResponse.json({ success: false, error: "Voucher tidak ditemukan" }, { status: 404 });
    }
    if (!voucher.isActive) {
      return NextResponse.json({ success: false, error: "Voucher tidak aktif" }, { status: 400 });
    }

    const now = new Date();
    if (voucher.startDate && now < voucher.startDate) {
      return NextResponse.json({ success: false, error: "Voucher belum berlaku" }, { status: 400 });
    }
    if (voucher.endDate && now > voucher.endDate) {
      return NextResponse.json({ success: false, error: "Voucher sudah kadaluarsa" }, { status: 400 });
    }
    if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
      return NextResponse.json({ success: false, error: "Kuota voucher sudah habis" }, { status: 400 });
    }

    const minPurchase = Number(voucher.minPurchase);
    if (amount > 0 && amount < minPurchase) {
      return NextResponse.json({
        success: false,
        error: `Minimum pembelian Rp ${minPurchase.toLocaleString("id-ID")} untuk voucher ini`,
      }, { status: 400 });
    }

    // Per-user limit check
    if (userId) {
      const claimCount = await prisma.voucherClaim.count({
        where: { voucherId: voucher.id, userId },
      });
      if (claimCount >= voucher.perUserLimit) {
        return NextResponse.json({ success: false, error: "Kamu sudah menggunakan voucher ini" }, { status: 400 });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discountType === "FIXED") {
      discountAmount = Number(voucher.discountValue);
    } else {
      discountAmount = Math.floor((amount * Number(voucher.discountValue)) / 100);
      if (voucher.maxDiscount !== null) {
        discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
      }
    }
    // Don't let discount exceed the amount
    if (amount > 0) discountAmount = Math.min(discountAmount, amount);

    const finalAmount = Math.max(1, amount - discountAmount);

    return NextResponse.json({
      success: true,
      data: {
        code: voucher.code,
        title: voucher.title,
        discountType: voucher.discountType,
        discountValue: Number(voucher.discountValue),
        maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : null,
        minPurchase: Number(voucher.minPurchase),
        discountAmount,
        finalAmount,
      },
    });
  } catch (err) {
    console.error("[vouchers/validate] error", err);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
