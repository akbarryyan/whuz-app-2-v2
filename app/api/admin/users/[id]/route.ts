import { NextRequest, NextResponse } from "next/server";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tier: {
          select: {
            id: true,
            name: true,
            label: true,
            marginMultiplier: true,
          },
        },
        wallet: { select: { balance: true } },
        _count: {
          select: {
            orders: true,
            sellerProducts: true,
            sellerOrders: true,
          },
        },
        sellerProfile: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        tier: user.tier
          ? { ...user.tier, marginMultiplier: Number(user.tier.marginMultiplier) }
          : null,
        walletBalance: user.wallet ? Number(user.wallet.balance) : 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/users/[id]]", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil detail user" }, { status: 500 });
  }
}
