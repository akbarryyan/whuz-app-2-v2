/**
 * GET  /api/admin/tiers       — list all tiers
 * POST /api/admin/tiers       — create a new tier
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [tiers, nullTierCount] = await Promise.all([
    prisma.userTier.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { users: true } } },
    }),
    prisma.user.count({ where: { tierId: null } }),
  ]);

  // Users with no tierId fall back to the default tier — include them in that tier's count
  const data = tiers.map((t) => ({
    ...t,
    _count: { users: t._count.users + (t.isDefault ? nullTierCount : 0) },
  }));

  return NextResponse.json({ success: true, data });
}

const CreateSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, "Hanya huruf kecil, angka, underscore"),
  label: z.string().min(1),
  description: z.string().optional(),
  marginMultiplier: z.number().min(0).max(1),
  minOrders: z.number().int().min(0).default(0),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, label, description, marginMultiplier, isDefault, sortOrder } = parsed.data;

  // Check name uniqueness
  const existing = await prisma.userTier.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ success: false, error: "Nama tier sudah ada" }, { status: 409 });
  }

  // If setting as default, unset others
  if (isDefault) {
    await prisma.userTier.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const tier = await prisma.userTier.create({
    data: {
      name,
      label,
      description: description ?? null,
      marginMultiplier,
      minOrders: parsed.data.minOrders,
      isDefault: isDefault ?? false,
      sortOrder: sortOrder ?? 99,
    },
  });

  return NextResponse.json({ success: true, data: tier }, { status: 201 });
}
