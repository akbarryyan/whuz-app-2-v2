import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const UpdateWithdrawalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID", "CANCELLED"]),
  bankCode: z.string().trim().max(40).optional(),
  payoutRefId: z.string().trim().max(120).optional(),
  processedNote: z.string().max(1000).optional(),
});

type UpdateWithdrawalInput = z.infer<typeof UpdateWithdrawalSchema>;
type WithdrawalStatus = UpdateWithdrawalInput["status"];

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function defaultProcessedNote(status: WithdrawalStatus): string {
  if (status === "APPROVED") return "Withdraw disetujui, menunggu transfer manual.";
  if (status === "PAID") return "Withdraw dibayar manual oleh admin.";
  if (status === "REJECTED") return "Withdraw ditolak admin.";
  return "Withdraw dibatalkan admin.";
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
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.sellerWithdrawalRequest.findUnique({
        where: { id },
      });

      if (!request) throw new Error("Request withdraw tidak ditemukan");
      if (request.status === "PAID" || request.status === "REJECTED" || request.status === "CANCELLED") {
        throw new Error("Request ini sudah diproses sebelumnya");
      }

      const bankCode = trimOrNull(parsed.data.bankCode) ?? request.bankCode;
      const payoutRefId = trimOrNull(parsed.data.payoutRefId) ?? request.payoutRefId;
      const processedNote = trimOrNull(parsed.data.processedNote) ?? defaultProcessedNote(parsed.data.status);

      if (parsed.data.status === "APPROVED") {
        if (request.status !== "PENDING") {
          throw new Error("Withdraw hanya bisa di-approve dari status PENDING.");
        }

        return tx.sellerWithdrawalRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED",
            bankCode,
            payoutGateway: "MANUAL",
            payoutRefId,
            processedNote,
            processedAt: new Date(),
          },
        });
      }

      if (parsed.data.status === "REJECTED" || parsed.data.status === "CANCELLED") {
        const isLegacyGatewayPayout =
          request.status === "APPROVED" &&
          request.payoutGateway !== null &&
          request.payoutGateway !== "MANUAL";

        if (request.status !== "PENDING" && request.status !== "APPROVED") {
          throw new Error("Withdraw ini tidak bisa dibatalkan dari status saat ini.");
        }

        if (isLegacyGatewayPayout) {
          throw new Error("Withdraw sudah dikirim ke gateway payout legacy. Review manual sebelum release saldo.");
        }

        const wallet = await tx.wallet.findUnique({ where: { userId: request.userId } });
        const existingReleaseLedger = wallet
          ? await tx.ledgerEntry.findFirst({
              where: {
                walletId: wallet.id,
                type: "WITHDRAW_RELEASE",
                reference: request.id,
              },
              select: { id: true },
            })
          : null;

        if (wallet && !existingReleaseLedger) {
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
          bankCode,
          payoutGateway: request.payoutGateway ?? "MANUAL",
          payoutRefId,
          processedNote,
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
