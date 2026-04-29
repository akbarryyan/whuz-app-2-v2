import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

const WithdrawalSchema = z.object({
  amount: z.number().positive(),
  bankCode: z.string().trim().max(40).optional(),
  accountName: z.string().min(2).max(120),
  accountNumber: z.string().min(3).max(80),
  bankName: z.string().min(2).max(120),
  note: z.string().max(1000).optional(),
});

export async function GET() {
  const seller = await requireSellerSession();
  if ("error" in seller) {
    return NextResponse.json({ success: false, error: seller.error }, { status: seller.status });
  }

  const [wallet, withdrawals] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId: seller.session.userId! },
      select: { balance: true, updatedAt: true },
    }),
    prisma.sellerWithdrawalRequest.findMany({
      where: { userId: seller.session.userId! },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    success: true,
    wallet: wallet
      ? {
          balance: Number(wallet.balance),
          updatedAt: wallet.updatedAt,
        }
      : { balance: 0, updatedAt: null },
    data: withdrawals.map((item) => ({
      ...item,
      amount: Number(item.amount),
    })),
  });
}

export async function POST(req: NextRequest) {
  const seller = await requireSellerSession();
  if ("error" in seller) {
    return NextResponse.json({ success: false, error: seller.error }, { status: seller.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
  }

  const parsed = WithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId: seller.session.userId! },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId: seller.session.userId!, balance: 0 },
        });
      }

      const balanceBefore = Number(wallet.balance);
      if (balanceBefore < parsed.data.amount) {
        throw new Error("Saldo seller tidak cukup untuk withdraw");
      }

      const balanceAfter = balanceBefore - parsed.data.amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: new Prisma.Decimal(balanceAfter) },
      });

      const request = await tx.sellerWithdrawalRequest.create({
        data: {
          userId: seller.session.userId!,
          amount: new Prisma.Decimal(parsed.data.amount),
          status: "PENDING",
          bankCode: parsed.data.bankCode?.trim() || null,
          accountName: parsed.data.accountName.trim(),
          accountNumber: parsed.data.accountNumber.trim(),
          bankName: parsed.data.bankName.trim(),
          note: parsed.data.note?.trim() || null,
          payoutGateway: "MANUAL",
          processedNote: "Menunggu diproses admin.",
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAW_HOLD",
          amount: new Prisma.Decimal(parsed.data.amount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          reference: request.id,
          description: `Hold withdraw seller ${request.id}`,
        },
      });

      return request;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        amount: Number(result.amount),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat request withdraw";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
