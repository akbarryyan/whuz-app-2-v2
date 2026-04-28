/**
 * GET    /api/admin/tiers/[id]  — get single tier
 * PUT    /api/admin/tiers/[id]  — update tier
 * DELETE /api/admin/tiers/[id]  — delete tier (cannot delete if users assigned or if it's the only tier)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tier = await prisma.userTier.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!tier) return NextResponse.json({ success: false, error: "Tier tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ success: true, data: tier });
}

const UpdateSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  marginMultiplier: z.number().min(0).max(1).optional(),
  minOrders: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.userTier.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Tier tidak ditemukan" }, { status: 404 });

  // If setting as default, unset others
  if (parsed.data.isDefault) {
    await prisma.userTier.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }

  const { label, description, marginMultiplier, minOrders, isDefault, sortOrder } = parsed.data;

  const tier = await prisma.userTier.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(description !== undefined && { description: description === "" ? null : description }),
      ...(marginMultiplier !== undefined && { marginMultiplier }),
      ...(minOrders !== undefined && { minOrders }),
      ...(isDefault !== undefined && { isDefault }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json({ success: true, data: tier });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tier = await prisma.userTier.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!tier) return NextResponse.json({ success: false, error: "Tier tidak ditemukan" }, { status: 404 });

  if (tier._count.users > 0) {
    return NextResponse.json(
      { success: false, error: `Tidak bisa menghapus — ${tier._count.users} user masih menggunakan tier ini` },
      { status: 409 }
    );
  }

  if (tier.isDefault) {
    return NextResponse.json({ success: false, error: "Tidak bisa menghapus tier default" }, { status: 409 });
  }

  await prisma.userTier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
