/**
 * GET  /api/admin/promos  — list all promos (including inactive)
 * POST /api/admin/promos  — create new promo
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const promos = await prisma.promo.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ success: true, data: promos });
  } catch (err) {
    console.error("[GET /api/admin/promos]", err);
    return NextResponse.json({ success: false, error: "Gagal memuat promo." }, { status: 500 });
  }
}

const CreateSchema = z.object({
  title:       z.string().min(1, "Judul wajib diisi"),
  description: z.string().optional(),
  imageUrl:    z.string().url("URL gambar tidak valid"),
  linkUrl:     z.string().url("URL link tidak valid").optional().or(z.literal("")),
  startDate:   z.string().datetime().optional().nullable(),
  endDate:     z.string().datetime().optional().nullable(),
  isActive:    z.boolean().optional().default(true),
  sortOrder:   z.number().int().optional().default(0),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { linkUrl, startDate, endDate, ...rest } = parsed.data;
  try {
    const promo = await prisma.promo.create({
      data: {
        ...rest,
        linkUrl: linkUrl || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
      },
    });
    return NextResponse.json({ success: true, data: promo }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/promos]", err);
    return NextResponse.json({ success: false, error: "Gagal membuat promo." }, { status: 500 });
  }
}
