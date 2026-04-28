/**
 * POST /api/webhook/vip
 *
 * Menerima notifikasi status transaksi dari VIP Reseller (Prepaid & Game/Streaming).
 * Berlaku untuk kedua jenis — strukturnya sama.
 *
 * Whitelist IP VIP Reseller: 178.248.73.218
 *
 * Header:
 *   X-Client-Signature: md5(API_ID + API_KEY)
 *
 * Payload:
 *   {
 *     result: true,
 *     data: [{ trxid, data, service, status, note, price }],
 *     message: "..."
 *   }
 *
 * Status dari VIP:
 *   waiting / processing → PROCESSING_PROVIDER (abaikan, tunggu update berikutnya)
 *   success              → SUCCESS
 *   error                → FAILED
 */

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { OrderStatus } from "@/src/core/domain/enums/order.enum";
import { checkAndUpgradeUserTier } from "@/lib/pricing";

export const dynamic = "force-dynamic";

// IP resmi VIP Reseller yang boleh kirim webhook
const VIP_WEBHOOK_IP = "178.248.73.218";

function ok() {
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function POST(req: NextRequest) {
  // ── 1. Parse body ─────────────────────────────────────────────────────────
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    console.error("[Webhook/VIP] Failed to parse JSON body");
    return ok(); // kembalikan 200 agar VIP tidak retry
  }

  console.log("[Webhook/VIP] Received:", JSON.stringify(payload));

  // ── 2. Validasi signature ─────────────────────────────────────────────────
  const signature = req.headers.get("x-client-signature") ?? "";
  const apiId = process.env.VIP_API_ID ?? "";
  const apiKey = process.env.VIP_API_KEY ?? "";
  const expectedSig = createHash("md5").update(apiId + apiKey).digest("hex");

  if (signature && expectedSig && signature !== expectedSig) {
    console.warn("[Webhook/VIP] Invalid signature. Received:", signature);
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  // ── 3. Validasi IP (optional extra security) ───────────────────────────────
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  const clientIp = forwardedFor.split(",")[0].trim();
  if (clientIp && clientIp !== VIP_WEBHOOK_IP) {
    console.warn(`[Webhook/VIP] Request from unexpected IP: ${clientIp}`);
    // Log only — jangan reject karena bisa jadi ada proxy/CDN
  }

  // ── 4. Normalise payload — Prepaid: data adalah array, Game: data adalah object ──
  if (!payload.data) {
    console.warn("[Webhook/VIP] Missing data field in payload");
    return ok();
  }

  // Normalise: pastikan item selalu berupa single object
  const item = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  const { trxid, status: vipStatus, note } = item;

  if (!trxid) {
    console.warn("[Webhook/VIP] Missing trxid in webhook payload");
    return ok();
  }

  // ── 5. Map status VIP → status internal ───────────────────────────────────
  // waiting / processing → masih berjalan, abaikan (tunggu webhook success/error)
  if (vipStatus === "waiting" || vipStatus === "processing") {
    console.log(`[Webhook/VIP] trxid=${trxid} status=${vipStatus} — ignoring interim status`);
    return ok();
  }

  const isFinal = vipStatus === "success" || vipStatus === "error";
  if (!isFinal) {
    console.warn(`[Webhook/VIP] Unknown status: ${vipStatus}. Ignoring.`);
    return ok();
  }

  // ── 6. Cari order berdasarkan providerRef ─────────────────────────────────
  const orderRepo = new OrderRepository();
  const order = await orderRepo.findByProviderRef(trxid);

  if (!order) {
    console.warn(`[Webhook/VIP] No order found with providerRef=${trxid}`);
    return ok();
  }

  // Jika order sudah terminal, skip
  if (order.status === OrderStatus.SUCCESS || order.status === OrderStatus.FAILED) {
    console.log(`[Webhook/VIP] Order ${order.id} already ${order.status}. Skipping.`);
    return ok();
  }

  // ── 7. Update order status ────────────────────────────────────────────────
  if (vipStatus === "success") {
    // SN biasanya ada di note
    const serialNumber = note && note !== "" ? note : undefined;

    await orderRepo.updateStatus(order.id, OrderStatus.SUCCESS, {
      serialNumber,
      notes: `VIP webhook: success${serialNumber ? ` | SN: ${serialNumber}` : ""}`,
    });

    // Finalize wallet debit jika bayar pakai wallet
    if (order.paymentMethod === "WALLET" && order.userId) {
      await orderRepo.finalizeDebitLedger(order.userId, Number(order.amount), order.id);
    }

    // Cek upgrade tier
    if (order.userId) {
      await checkAndUpgradeUserTier(order.userId).catch(() => {});
    }

    console.log(`[Webhook/VIP] Order ${order.id} → SUCCESS. SN: ${serialNumber ?? "-"}`);
  } else {
    // vipStatus === "error"
    await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
      notes: `VIP webhook: error | ${note || "No note"}`,
    });

    // Kembalikan saldo wallet jika bayar pakai wallet
    if (order.paymentMethod === "WALLET" && order.userId) {
      await orderRepo.releaseWalletHold(order.userId, Number(order.amount), order.id);
    }

    console.log(`[Webhook/VIP] Order ${order.id} → FAILED. Note: ${note}`);
  }

  return ok();
}
