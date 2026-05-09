import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  platformFeeType: z.enum(["PERCENT", "FIXED"]).optional(),
  platformFeeValue: z.number().min(0).max(1000000).optional(),
  applyFeeToProducts: z.boolean().optional(),
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

    if (
      parsed.data.isActive === undefined &&
      parsed.data.platformFeeType === undefined &&
      parsed.data.platformFeeValue === undefined
    ) {
      return NextResponse.json({ success: false, error: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    const merchant = await prisma.$transaction(async (tx) => {
      const updated =
        parsed.data.isActive !== undefined
          ? await tx.sellerProfile.update({
              where: { id },
              data: { isActive: parsed.data.isActive },
              select: {
                id: true,
                userId: true,
                isActive: true,
                displayName: true,
                slug: true,
              },
            })
          : await tx.sellerProfile.findUniqueOrThrow({
              where: { id },
              select: {
                id: true,
                userId: true,
                isActive: true,
                displayName: true,
                slug: true,
              },
            });

      if (parsed.data.platformFeeType !== undefined || parsed.data.platformFeeValue !== undefined) {
        await tx.$executeRaw`
          UPDATE seller_profiles
          SET
            platformFeeType = ${parsed.data.platformFeeType ?? "FIXED"},
            platformFeeValue = ${parsed.data.platformFeeValue ?? 0}
          WHERE id = ${id}
        `;
      }

      if (
        parsed.data.applyFeeToProducts &&
        parsed.data.platformFeeType !== undefined &&
        parsed.data.platformFeeValue !== undefined
      ) {
        await tx.sellerProduct.updateMany({
          where: { sellerId: updated.userId },
          data: {
            feeType: parsed.data.platformFeeType,
            feeValue: parsed.data.platformFeeValue,
          },
        });
      }

      const [feeRow] = await tx.$queryRaw<
        Array<{ platformFeeType: string | null; platformFeeValue: number | string | null }>
      >`
        SELECT platformFeeType, platformFeeValue
        FROM seller_profiles
        WHERE id = ${id}
        LIMIT 1
      `;

      return {
        ...updated,
        platformFeeType: feeRow?.platformFeeType === "PERCENT" ? "PERCENT" : "FIXED",
        platformFeeValue: Number(feeRow?.platformFeeValue ?? 0),
      };
    });

    return NextResponse.json({
      success: true,
      data: merchant,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/merchants/[id]]", error);
    return NextResponse.json({ success: false, error: "Gagal memperbarui merchant" }, { status: 500 });
  }
}
