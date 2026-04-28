import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/wallet
 * Daftar semua user beserta info wallet (balance, total ledger entries)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  try {
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            updatedAt: true,
            _count: { select: { ledgerEntries: true } },
          },
        },
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
        wallet: u.wallet
          ? {
              id: u.wallet.id,
              balance: Number(u.wallet.balance),
              entryCount: u.wallet._count.ledgerEntries,
              updatedAt: u.wallet.updatedAt,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error("[wallet GET]", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data wallet" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wallet
 * Body: { action: "CREDIT"|"HOLD"|"DEBIT"|"RELEASE"|"REFUND", userId, amount, reference?, description? }
 *
 * CREDIT  → tambah saldo (top-up, refund manual, dll.)
 * HOLD    → tahan saldo (kurangi balance untuk transaksi pending)
 * RELEASE → kembalikan hold (batal transaksi)
 * DEBIT   → potong saldo langsung (tanpa hold step)
 * REFUND  → kembalikan saldo setelah debit
 */
export async function POST(req: NextRequest) {
  let body: {
    action: string;
    userId: string;
    amount: number;
    reference?: string;
    description?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
  }

  const { action, userId, amount, reference, description } = body;

  const VALID_ACTIONS = ["CREDIT", "HOLD", "DEBIT", "RELEASE", "REFUND"];
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ success: false, error: `Action tidak valid. Gunakan: ${VALID_ACTIONS.join(", ")}` }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: "userId wajib diisi" }, { status: 400 });
  }

  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    return NextResponse.json({ success: false, error: "Amount harus lebih dari 0" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Ambil atau buat wallet user
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        // Auto-create wallet jika belum ada
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User tidak ditemukan");
        wallet = await tx.wallet.create({
          data: { userId, balance: new Prisma.Decimal(0) },
        });
      }

      const balanceBefore = Number(wallet.balance);
      let balanceDelta: number;

      // Hitung delta berdasarkan action
      if (action === "CREDIT" || action === "RELEASE" || action === "REFUND") {
        // Tambah saldo
        balanceDelta = parsedAmount;
      } else {
        // HOLD / DEBIT — kurangi saldo
        if (balanceBefore < parsedAmount) {
          throw new Error(`Saldo tidak cukup. Saldo saat ini: Rp ${balanceBefore.toLocaleString("id")}`);
        }
        balanceDelta = -parsedAmount;
      }

      const balanceAfter = balanceBefore + balanceDelta;

      // Update balance
      await tx.wallet.update({
        where: { id: wallet!.id },
        data: { balance: new Prisma.Decimal(balanceAfter) },
      });

      // Catat ledger
      const entry = await tx.ledgerEntry.create({
        data: {
          walletId: wallet!.id,
          type: action,
          amount: new Prisma.Decimal(parsedAmount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          reference: reference ?? null,
          description: description ?? null,
        },
      });

      return { wallet: { id: wallet!.id, balanceBefore, balanceAfter }, entry };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[wallet POST]", err);
    return NextResponse.json(
      { success: false, error: err.message ?? "Gagal memproses operasi wallet" },
      { status: 400 }
    );
  }
}
