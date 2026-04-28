import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";
import { PoppayClient } from "@/src/infra/payment/poppay/poppay.client";

export const dynamic = "force-dynamic";

const WithdrawalSchema = z.object({
  amount: z.number().positive(),
  bankCode: z.string().trim().max(40).optional(),
  accountName: z.string().min(2).max(120),
  accountNumber: z.string().min(3).max(80),
  bankName: z.string().min(2).max(120),
  note: z.string().max(1000).optional(),
});

function normalizeBankLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(pt|tbk|persero)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolvePoppayCallbackUrl(): string | null {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "";

  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/api/webhook/poppay`;
}

async function resolvePoppayBankCode(explicitBankCode: string | null | undefined, bankName: string): Promise<string> {
  if (explicitBankCode?.trim()) return explicitBankCode.trim();

  const client = new PoppayClient();
  const banks = await client.listBanks({ start: 0, length: 500, filters: [{ key: "c", value: "IDR" }] });
  const normalizedTarget = normalizeBankLabel(bankName);

  const exact = banks.data.find((item) => normalizeBankLabel(item.name) === normalizedTarget);
  if (exact) return exact.code;

  const contains = banks.data.filter((item) => normalizeBankLabel(item.name).includes(normalizedTarget));
  if (contains.length === 1) return contains[0].code;

  throw new Error(
    `Kode bank Poppay untuk "${bankName}" belum ditemukan. Mohon pilih nama bank yang lebih spesifik atau simpan bankCode.`
  );
}

function toPrismaJson(
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value ? (value as Prisma.InputJsonValue) : Prisma.JsonNull;
}

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

  let createdRequestId: string | null = null;
  let payoutSubmitted = false;

  try {
    const createdRequest = await prisma.$transaction(async (tx) => {
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
    createdRequestId = createdRequest.id;

    const bankCode = await resolvePoppayBankCode(parsed.data.bankCode, parsed.data.bankName);
    const client = new PoppayClient();
    const payout = await client.createOutgoing({
      aggRefId: `withdraw-${createdRequest.id}`,
      amount: Number(createdRequest.amount),
      bankCode,
      destinationAccountNumber: createdRequest.accountNumber,
      destinationAccountName: createdRequest.accountName,
      notes: createdRequest.note || `Withdraw merchant ${createdRequest.id}`,
      callbackUrl: resolvePoppayCallbackUrl(),
    });
    payoutSubmitted = true;

    const result = await prisma.sellerWithdrawalRequest.update({
      where: { id: createdRequest.id },
      data: {
        status: "APPROVED",
        bankCode,
        payoutGateway: "POPPAY",
        payoutRefId: payout.refId,
        payoutAggRefId: payout.aggregatorRefId,
        payoutRawPayload: toPrismaJson(payout.raw),
        processedNote: "Payout otomatis dikirim ke Poppay.",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        amount: Number(result.amount),
      },
    });
  } catch (error: unknown) {
    if (createdRequestId && !payoutSubmitted) {
      const requestId = createdRequestId;
      await prisma.$transaction(async (tx) => {
        const request = await tx.sellerWithdrawalRequest.findUnique({
          where: { id: requestId },
        });

        if (!request || request.status !== "PENDING") return;

        const wallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
        if (!wallet) return;

        const balanceBefore = Number(wallet.balance);
        const balanceAfter = balanceBefore + Number(request.amount);

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: new Prisma.Decimal(balanceAfter) },
        });

        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "WITHDRAW_RELEASE",
            amount: request.amount,
            balanceBefore: new Prisma.Decimal(balanceBefore),
            balanceAfter: new Prisma.Decimal(balanceAfter),
            reference: request.id,
            description: `Release withdraw seller ${request.id} karena create outgoing gagal`,
          },
        });

        await tx.sellerWithdrawalRequest.update({
          where: { id: request.id },
          data: {
            status: "REJECTED",
            processedNote:
              error instanceof Error ? error.message : "Create outgoing gagal",
            processedAt: new Date(),
          },
        });
      });
    }

    const message = error instanceof Error ? error.message : "Gagal membuat request withdraw";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
