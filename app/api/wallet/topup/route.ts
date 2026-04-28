/**
 * POST /api/wallet/topup
 *
 * Initiates a wallet top-up via Poppay QRIS payment gateway.
 * Returns payment URL to redirect the user to.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";
import { PoppayAdapter } from "@/src/infra/payment/poppay/poppay.adapter";

export const dynamic = "force-dynamic";

const ALLOWED_AMOUNTS = [10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000];

const TopupSchema = z.object({
  amount: z.number().int().positive().refine(
    (v) => ALLOWED_AMOUNTS.includes(v),
    { message: `Amount harus salah satu dari: ${ALLOWED_AMOUNTS.map((a) => a.toLocaleString("id-ID")).join(", ")}` }
  ),
  paymentMethod: z.string().min(1).optional(),  // QRIS only
  redirectUrl: z.string().url().optional(),
});

/** Generate topup code: WT-YYYYMMDD-XXXX */
function generateTopupCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WT-${date}-${rand}`;
}

export async function POST(request: Request) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    // ── Parse & validate ───────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = TopupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { amount, paymentMethod, redirectUrl } = parsed.data;

    // ── Generate unique topup code ─────────────────────────────────────────
    let topupCode = generateTopupCode();
    // Ensure uniqueness (retry once on collision)
    const existing = await prisma.walletTopup.findUnique({ where: { topupCode } });
    if (existing) topupCode = generateTopupCode();

    // ── Ensure user wallet exists ──────────────────────────────────────────
    await prisma.wallet.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, balance: 0 },
      update: {},
    });

    // ── Create PENDING topup record ────────────────────────────────────────
    const topup = await prisma.walletTopup.create({
      data: {
        topupCode,
        userId: session.userId,
        amount,
        status: "PENDING",
      },
    });

    // ── Create Poppay QRIS invoice ─────────────────────────────────────────
    const gateway = new PoppayAdapter();

    let paymentResult;
    try {
      paymentResult = await gateway.createPayment({
        orderId: topupCode,
        amount,
        method: paymentMethod ?? "qris",
        redirectUrl,
        description: `Top up saldo ${session.userId}`,
      });
    } catch (err: unknown) {
      // Roll back the pending record
      await prisma.walletTopup.delete({ where: { id: topup.id } });
      console.error("[Wallet Topup] Poppay createPayment failed:", err);
      return NextResponse.json(
        { success: false, error: "Gagal membuat invoice pembayaran. Coba lagi." },
        { status: 502 }
      );
    }

    // ── Update topup with payment details ──────────────────────────────────
    const updated = await prisma.walletTopup.update({
      where: { id: topup.id },
      data: {
        fee: paymentResult.fee,
        totalPayment: paymentResult.totalPayment,
        paymentMethod: paymentResult.method ?? paymentMethod ?? null,
        paymentUrl: paymentResult.paymentUrl,
        paymentNumber: paymentResult.paymentNumber ?? null,
        invoiceId: paymentResult.invoiceId,
        expiredAt: paymentResult.expiredAt ?? null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          topupCode: updated.topupCode,
          amount: Number(updated.amount),
          fee: Number(updated.fee),
          totalPayment: Number(updated.totalPayment),
          paymentUrl: updated.paymentUrl,
          paymentNumber: updated.paymentNumber,
          paymentMethod: updated.paymentMethod,
          expiredAt: updated.expiredAt,
          status: updated.status,
        },
        mode: "poppay",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/wallet/topup]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
