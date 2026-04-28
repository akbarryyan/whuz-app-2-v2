/**
 * GET  /api/admin/vouchers  — list all vouchers with claim stats
 * POST /api/admin/vouchers  — create new voucher
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { claims: true } },
      },
    });

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
      isActive: v.isActive,
      totalClaims: v._count.claims,
      createdAt: v.createdAt,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GET /api/admin/vouchers]", err);
    return NextResponse.json({ success: false, error: "Gagal memuat voucher." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const {
      code, title, description, discountType, discountValue,
      maxDiscount, minPurchase, quota, perUserLimit,
      startDate, endDate, isActive,
    } = body;

    if (!code || !title || !discountType || discountValue === undefined) {
      return NextResponse.json({ success: false, error: "Field wajib: code, title, discountType, discountValue" }, { status: 422 });
    }
    if (!["PERCENT", "FIXED"].includes(discountType)) {
      return NextResponse.json({ success: false, error: "discountType harus PERCENT atau FIXED" }, { status: 422 });
    }
    if (discountType === "PERCENT" && (Number(discountValue) < 0 || Number(discountValue) > 100)) {
      return NextResponse.json({ success: false, error: "Persen diskon harus 0–100" }, { status: 422 });
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: (code as string).toUpperCase().trim(),
        title,
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        minPurchase: Number(minPurchase ?? 0),
        quota: quota ? Number(quota) : null,
        perUserLimit: Number(perUserLimit ?? 1),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ success: true, data: voucher }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ success: false, error: "Kode voucher sudah dipakai." }, { status: 409 });
    }
    console.error("[POST /api/admin/vouchers]", err);
    return NextResponse.json({ success: false, error: "Gagal membuat voucher." }, { status: 500 });
  }
}
