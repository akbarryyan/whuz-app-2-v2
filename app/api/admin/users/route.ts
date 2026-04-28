import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Daftar user ringkas untuk keperluan admin (test transaksi, dll.)
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        tierId: true,
        tier: { select: { id: true, name: true, label: true, marginMultiplier: true } },
        wallet: { select: { balance: true } },
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        tierId: u.tierId,
        tier: u.tier ? { ...u.tier, marginMultiplier: Number(u.tier.marginMultiplier) } : null,
        balance: u.wallet ? Number(u.wallet.balance) : 0,
        totalOrders: u._count.orders,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data user" }, { status: 500 });
  }
}
