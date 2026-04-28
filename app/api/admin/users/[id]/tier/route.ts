/**
 * PATCH /api/admin/users/[id]/tier  — assign or remove tier from a user
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const Schema = z.object({
  tierId: z.string().nullable(), // null = revert to default tier
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });

  // Verify tier exists if not null
  if (parsed.data.tierId !== null) {
    const tier = await prisma.userTier.findUnique({ where: { id: parsed.data.tierId } });
    if (!tier) return NextResponse.json({ success: false, error: "Tier tidak ditemukan" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { tierId: parsed.data.tierId },
    include: { tier: true },
  });

  return NextResponse.json({ success: true, data: { id: updated.id, tierId: updated.tierId, tier: updated.tier } });
}
