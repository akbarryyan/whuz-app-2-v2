import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/wallet/ledger?userId=xxx&page=1&limit=20&type=HOLD
 * Histori ledger entries untuk user tertentu
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const userId = searchParams.get("userId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(5, Number(searchParams.get("limit") ?? "20")));
  const typeFilter = searchParams.get("type") ?? "";

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId wajib diisi" },
      { status: 400 }
    );
  }

  try {
    // Cari wallet milik user
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        updatedAt: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!wallet) {
      return NextResponse.json({
        success: true,
        wallet: null,
        data: [],
        total: 0,
        page,
        limit,
      });
    }

    const where = {
      walletId: wallet.id,
      ...(typeFilter ? { type: typeFilter } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance),
        updatedAt: wallet.updatedAt,
        user: wallet.user,
      },
      data: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: Number(e.amount),
        balanceBefore: Number(e.balanceBefore),
        balanceAfter: Number(e.balanceAfter),
        reference: e.reference,
        description: e.description,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[wallet/ledger GET]", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil ledger" },
      { status: 500 }
    );
  }
}
