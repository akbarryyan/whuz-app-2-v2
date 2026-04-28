/**
 * PATCH  /api/admin/vouchers/[id]  — update voucher
 * DELETE /api/admin/vouchers/[id]  — delete voucher
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const {
      code, title, description, discountType, discountValue,
      maxDiscount, minPurchase, quota, perUserLimit,
      startDate, endDate, isActive,
    } = body;

    // Build update data selectively
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (code !== undefined) data.code = (code as string).toUpperCase().trim();
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (discountType !== undefined) data.discountType = discountType;
    if (discountValue !== undefined) data.discountValue = Number(discountValue);
    if (maxDiscount !== undefined) data.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (minPurchase !== undefined) data.minPurchase = Number(minPurchase);
    if (quota !== undefined) data.quota = quota ? Number(quota) : null;
    if (perUserLimit !== undefined) data.perUserLimit = Number(perUserLimit);
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const voucher = await prisma.voucher.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: voucher });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ success: false, error: "Voucher tidak ditemukan." }, { status: 404 });
    }
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ success: false, error: "Kode voucher sudah dipakai." }, { status: 409 });
    }
    console.error("[PATCH /api/admin/vouchers]", err);
    return NextResponse.json({ success: false, error: "Gagal mengupdate voucher." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.voucher.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ success: false, error: "Voucher tidak ditemukan." }, { status: 404 });
    }
    console.error("[DELETE /api/admin/vouchers]", err);
    return NextResponse.json({ success: false, error: "Gagal menghapus voucher." }, { status: 500 });
  }
}
