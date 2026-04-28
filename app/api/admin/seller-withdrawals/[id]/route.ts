import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { PoppayClient } from "@/src/infra/payment/poppay/poppay.client";

export const dynamic = "force-dynamic";

const UpdateWithdrawalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID", "CANCELLED"]),
  bankCode: z.string().trim().max(40).optional(),
  processedNote: z.string().max(1000).optional(),
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

function toPrismaJson(
  value: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value
    ? (value as Prisma.InputJsonValue)
    : Prisma.JsonNull;
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
    `Kode bank Poppay untuk "${bankName}" belum ditemukan. Simpan bankCode yang benar sebelum approve withdraw.`
  );
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
  }

  const parsed = UpdateWithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const current = await prisma.sellerWithdrawalRequest.findUnique({
      where: { id },
    });

    if (!current) {
      throw new Error("Request withdraw tidak ditemukan");
    }

    if (parsed.data.status === "APPROVED") {
      if (current.status !== "PENDING") {
        throw new Error("Withdraw hanya bisa di-approve dari status PENDING.");
      }

      const bankCode = await resolvePoppayBankCode(parsed.data.bankCode || current.bankCode, current.bankName);
      const client = new PoppayClient();
      const payout = await client.createOutgoing({
        aggRefId: `withdraw-${current.id}`,
        amount: Number(current.amount),
        bankCode,
        destinationAccountNumber: current.accountNumber,
        destinationAccountName: current.accountName,
        notes: current.note || parsed.data.processedNote || `Withdraw merchant ${current.id}`,
        callbackUrl: resolvePoppayCallbackUrl(),
      });

      const result = await prisma.sellerWithdrawalRequest.update({
        where: { id: current.id },
        data: {
          status: "APPROVED",
          bankCode,
          payoutGateway: "POPPAY",
          payoutRefId: payout.refId,
          payoutAggRefId: payout.aggregatorRefId,
          payoutRawPayload: toPrismaJson(payout.raw),
          processedNote: parsed.data.processedNote?.trim() || null,
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
    }

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.sellerWithdrawalRequest.findUnique({
        where: { id },
      });

      if (!request) throw new Error("Request withdraw tidak ditemukan");
      if (request.status === "PAID" || request.status === "REJECTED" || request.status === "CANCELLED") {
        throw new Error("Request ini sudah diproses sebelumnya");
      }

      if (parsed.data.status === "REJECTED" || parsed.data.status === "CANCELLED") {
        if (request.status !== "PENDING") {
          throw new Error("Withdraw yang sudah disubmit ke payout tidak bisa dibatalkan dari sini.");
        }

        const wallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
        if (wallet) {
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
              description: `Release withdraw seller ${request.id}`,
            },
          });
        }
      }

      if (parsed.data.status === "PAID") {
        const wallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
        const existingPaidLedger = wallet
          ? await tx.ledgerEntry.findFirst({
              where: {
                walletId: wallet.id,
                type: "WITHDRAW_PAID",
                reference: request.id,
              },
              select: { id: true },
            })
          : null;

        if (wallet && !existingPaidLedger) {
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              type: "WITHDRAW_PAID",
              amount: request.amount,
              balanceBefore: wallet.balance,
              balanceAfter: wallet.balance,
              reference: request.id,
              description: `Withdraw seller dibayar ${request.id}`,
            },
          });
        }
      }

      return tx.sellerWithdrawalRequest.update({
        where: { id: request.id },
        data: {
          status: parsed.data.status,
          bankCode: parsed.data.bankCode?.trim() || request.bankCode,
          processedNote: parsed.data.processedNote?.trim() || null,
          processedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        amount: Number(result.amount),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memproses withdraw";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
