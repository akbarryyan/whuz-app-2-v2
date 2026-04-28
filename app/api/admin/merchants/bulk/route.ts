import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  isActive: z.boolean(),
});

async function ensureAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

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

    const result = await prisma.sellerProfile.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { isActive: parsed.data.isActive },
    });

    return NextResponse.json({
      success: true,
      data: {
        count: result.count,
        isActive: parsed.data.isActive,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/admin/merchants/bulk]", error);
    return NextResponse.json({ success: false, error: "Gagal memperbarui merchant massal" }, { status: 500 });
  }
}
