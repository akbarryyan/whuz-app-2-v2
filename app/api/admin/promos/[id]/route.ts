/**
 * PUT    /api/admin/promos/[id]  — update promo
 * DELETE /api/admin/promos/[id]  — delete promo
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl:    z.string().url("URL gambar tidak valid").optional(),
  linkUrl:     z.string().url("URL link tidak valid").optional().nullable().or(z.literal("")),
  startDate:   z.string().datetime().optional().nullable(),
  endDate:     z.string().datetime().optional().nullable(),
  isActive:    z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { linkUrl, startDate, endDate, ...rest } = parsed.data;
  try {
    const promo = await prisma.promo.update({
      where: { id },
      data: {
        ...rest,
        ...(linkUrl !== undefined ? { linkUrl: linkUrl || null } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate   !== undefined ? { endDate:   endDate   ? new Date(endDate)   : null } : {}),
      },
    });
    return NextResponse.json({ success: true, data: promo });
  } catch (err) {
    console.error("[PUT /api/admin/promos]", err);
    return NextResponse.json({ success: false, error: "Gagal memperbarui promo." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.promo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/promos]", err);
    return NextResponse.json({ success: false, error: "Gagal menghapus promo." }, { status: 500 });
  }
}
