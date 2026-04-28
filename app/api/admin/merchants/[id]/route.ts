import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  isActive: z.boolean(),
});

async function ensureAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const merchant = await prisma.sellerProfile.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
      select: {
        id: true,
        isActive: true,
        displayName: true,
        slug: true,
      },
    });

    return NextResponse.json({ success: true, data: merchant });
  } catch (error) {
    console.error("[PATCH /api/admin/merchants/[id]]", error);
    return NextResponse.json({ success: false, error: "Gagal memperbarui merchant" }, { status: 500 });
  }
}
