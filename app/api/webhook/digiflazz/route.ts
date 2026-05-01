import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { checkAndUpgradeUserTier } from "@/lib/pricing";
import { OrderStatus, WebhookSource } from "@/src/core/domain/enums/order.enum";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";

export const dynamic = "force-dynamic";

interface DigiflazzWebhookData {
  ref_id?: string;
  status?: string;
  rc?: string;
  sn?: string;
  message?: string;
  buyer_sku_code?: string;
  customer_no?: string;
  price?: number;
  [key: string]: unknown;
}

interface DigiflazzWebhookPayload {
  data?: DigiflazzWebhookData;
  sed?: string;
  hook_id?: string;
  hook?: unknown;
  [key: string]: unknown;
}

function ok(extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...extra }, { status: 200 });
}

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.DIGIFLAZZ_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn("[Webhook/Digiflazz] DIGIFLAZZ_WEBHOOK_SECRET belum diset; signature dilewati.");
    return true;
  }

  if (!signature) return false;

  const expected = `sha1=${createHmac("sha1", secret).update(rawBody).digest("hex")}`;
  return signature === expected;
}

function normalizeStatus(status: string | undefined, rc: string | undefined) {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();
  const normalizedRc = String(rc ?? "").trim();

  if (normalizedRc === "00" || normalizedStatus === "sukses" || normalizedStatus === "success") {
    return "success";
  }

  if (
    normalizedStatus === "gagal" ||
    normalizedStatus === "failed" ||
    normalizedStatus === "error" ||
    (normalizedRc && normalizedRc !== "00" && normalizedRc !== "03")
  ) {
    return "failed";
  }

  return "pending";
}

function webhookJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const eventType = req.headers.get("x-digiflazz-event") ?? "unknown";
  const signature = req.headers.get("x-hub-signature");
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  if (!verifySignature(rawBody, signature)) {
    console.warn("[Webhook/Digiflazz] Invalid X-Hub-Signature");
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: DigiflazzWebhookPayload;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as DigiflazzWebhookPayload) : {};
  } catch {
    console.error("[Webhook/Digiflazz] Failed to parse JSON body");
    return ok();
  }

  console.log("[Webhook/Digiflazz] Received:", JSON.stringify({ eventType, userAgent, payload }));

  if (payload.sed && payload.hook_id) {
    return ok({ ping: true });
  }

  const data = payload.data;
  if (!data?.ref_id) {
    console.warn("[Webhook/Digiflazz] Missing data.ref_id");
    return ok();
  }

  const refId = data.ref_id;
  const status = normalizeStatus(data.status, data.rc);
  const eventId = `digiflazz:${refId}:${eventType}:${data.status ?? "unknown"}:${data.rc ?? "unknown"}:${data.sn ?? ""}`;
  const orderRepo = new OrderRepository();

  const { duplicate } = await orderRepo.findOrCreateWebhookEvent({
    source: WebhookSource.DIGIFLAZZ,
    eventId,
    eventType,
    payload: webhookJson(payload),
  });

  if (duplicate) {
    return ok({ duplicate: true });
  }

  try {
    if (status === "pending") {
      await orderRepo.markWebhookProcessed(eventId);
      return ok({ status: "pending" });
    }

    const order = await orderRepo.findByProviderRef(refId);
    if (!order) {
      console.warn(`[Webhook/Digiflazz] No order found with providerRef=${refId}`);
      await orderRepo.markWebhookProcessed(eventId);
      return ok();
    }

    if (order.status === OrderStatus.SUCCESS || order.status === OrderStatus.FAILED) {
      await orderRepo.markWebhookProcessed(eventId);
      return ok({ skipped: true });
    }

    if (status === "success") {
      await orderRepo.updateStatus(order.id, OrderStatus.SUCCESS, {
        serialNumber: data.sn || undefined,
        notes: `Digiflazz webhook: success${data.sn ? ` | SN: ${data.sn}` : ""}`,
      });

      if (order.paymentMethod === "WALLET" && order.userId) {
        await orderRepo.finalizeDebitLedger(order.userId, Number(order.amount), order.id);
      }

      if (order.userId) {
        await checkAndUpgradeUserTier(order.userId).catch(() => {});
      }
    } else {
      await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
        notes: `Digiflazz webhook: failed | ${data.message || data.status || data.rc || "No message"}`,
      });

      if (order.paymentMethod === "WALLET" && order.userId) {
        await orderRepo.releaseWalletHold(order.userId, Number(order.amount), order.id);
      }
    }

    await orderRepo.markWebhookProcessed(eventId);
    return ok({ status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    console.error("[Webhook/Digiflazz] Error:", message);
    await orderRepo.markWebhookProcessed(eventId, message).catch(() => {});
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
