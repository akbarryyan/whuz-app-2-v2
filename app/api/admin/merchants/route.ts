import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    const merchants = await prisma.sellerProfile.findMany({
      where: q
        ? {
            OR: [
              { displayName: { contains: q } },
              { slug: { contains: q } },
              { description: { contains: q } },
              { user: { is: { name: { contains: q } } } },
              { user: { is: { email: { contains: q } } } },
              { user: { is: { phone: { contains: q } } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        slug: true,
        displayName: true,
        description: true,
        profileImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            wallet: {
              select: {
                balance: true,
              },
            },
            sellerProducts: {
              where: { isActive: true },
              select: { id: true },
            },
            _count: {
              select: {
                sellerProducts: true,
                sellerOrders: true,
              },
            },
          },
        },
      },
    });

    const feeRows = merchants.length
      ? await prisma.$queryRaw<
          Array<{ id: string; platformFeeType: string | null; platformFeeValue: number | string | null }>
        >`SELECT id, platformFeeType, platformFeeValue FROM seller_profiles WHERE id IN (${Prisma.join(
          merchants.map((merchant) => merchant.id)
        )})`
      : [];
    const feeMap = new Map(
      feeRows.map((row) => [
        row.id,
        {
          platformFeeType: row.platformFeeType === "PERCENT" ? "PERCENT" : "FIXED",
          platformFeeValue: Number(row.platformFeeValue ?? 0),
        },
      ])
    );

    return NextResponse.json({
      success: true,
      data: merchants.map((merchant) => ({
        ...merchant,
        platformFeeType: feeMap.get(merchant.id)?.platformFeeType ?? "FIXED",
        platformFeeValue: feeMap.get(merchant.id)?.platformFeeValue ?? 0,
        user: {
          ...merchant.user,
          walletBalance: merchant.user.wallet ? Number(merchant.user.wallet.balance) : 0,
        },
        activeSellerProductsCount: merchant.user.sellerProducts.length,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/merchants]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
