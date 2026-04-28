import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isPoppayConfigured, PoppayClient } from "@/src/infra/payment/poppay/poppay.client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!(await isPoppayConfigured())) {
      return NextResponse.json(
        {
          success: false,
          error: "Poppay belum terkonfigurasi di environment.",
          requiredEnv: [
            "POPPAY_API_BASE_URL atau POPPAY_URL + POPPAY_PORT",
            "POPPAY_VERSION",
            "POPPAY_INTEGRATOR_TOKEN",
            "POPPAY_AGGREGATOR_CODE",
            "POPPAY_MERCHANT_ACCOUNT_NUMBER",
          ],
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? 0);
    const notes = String(body.notes ?? "QRIS Test");
    const payorName = body.payorName ? String(body.payorName) : "Guest";
    const payorEmail = body.payorEmail ? String(body.payorEmail) : null;
    const callbackUrl = body.callbackUrl ? String(body.callbackUrl) : null;
    const expirationInterval = Number(body.expirationInterval ?? 30);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "amount harus lebih dari 0." }, { status: 422 });
    }

    const client = new PoppayClient();
    const data = await client.createIncoming({
      aggRefId: body.aggRefId ? String(body.aggRefId) : crypto.randomUUID(),
      amount,
      notes,
      payorName,
      payorEmail,
      callbackUrl,
      expirationInterval: Number.isFinite(expirationInterval) ? expirationInterval : 30,
    });

    return NextResponse.json({
      success: true,
      gateway: "POPPAY",
      data,
    });
  } catch (error) {
    console.error("[POPPAY CREATE INCOMING ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gagal membuat transaksi incoming Poppay.",
      },
      { status: 502 }
    );
  }
}
