import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { checkAndUpgradeUserTier } from "@/lib/pricing";
import { OrderStatus, WebhookSource } from "@/src/core/domain/enums/order.enum";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { Agenh2hAdapter } from "@/src/infra/providers/agenh2h/agenh2h.adapter";
import { OrderFulfillmentService } from "@/src/core/services/order/order-fulfillment.service";

export const dynamic = "force-dynamic";

interface Agenh2hWebhookData {
  ref_id?: string;
  status?: string;
  produk?: string;
  sku?: string;
  price?: number | string;
  last_saldo?: number | string;
  tujuan?: string;
  message?: string;
  sign?: string;
  [key: string]: unknown;
}

interface Agenh2hWebhookPayload {
  data?: Agenh2hWebhookData;
  [key: string]: unknown;
}

function ok(extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...extra }, { status: 200 });
}

function webhookJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeWebhookStatus(statusValue?: string | null, messageValue?: string | null) {
  const status = String(statusValue ?? "").trim().toLowerCase();
  const message = String(messageValue ?? "").trim().toLowerCase();
  const text = `${status} ${message}`.trim();

  if (/(success|sukses|berhasil|done|complete)/.test(text)) return "success";
  if (/(fail|failed|gagal|error|cancel|reject)/.test(text)) return "failed";
  return "pending";
}

export async function POST(req: NextRequest) {
  let payload: Agenh2hWebhookPayload;
  try {
    payload = (await req.json()) as Agenh2hWebhookPayload;
  } catch {
    return ok();
  }

  const adapter = new Agenh2hAdapter();
  const verified = await adapter.verifyWebhook(payload).catch(() => false);
  if (!verified) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  const data = payload.data;
  const refId = String(data?.ref_id ?? "").trim();
  if (!refId) {
    return ok();
  }

  const status = normalizeWebhookStatus(data?.status, data?.message);
  const eventId = `agenh2h:${refId}:${data?.status ?? "unknown"}:${data?.sign ?? ""}`;
  const orderRepo = new OrderRepository();
  const fulfillmentService = new OrderFulfillmentService(orderRepo);

  const { duplicate } = await orderRepo.findOrCreateWebhookEvent({
    source: WebhookSource.AGENH2H,
    eventId,
    eventType: String(data?.status ?? "unknown"),
    payload: webhookJson(payload),
  });

  if (duplicate) {
    return ok({ duplicate: true });
  }

  try {
    const order = await orderRepo.findByProviderRef(refId);
    if (!order) {
      await orderRepo.markWebhookProcessed(eventId);
      return ok({ skipped: true });
    }

    if (
      order.status === OrderStatus.SUCCESS ||
      order.status === OrderStatus.FAILED ||
      order.status === OrderStatus.REFUNDED
    ) {
      await orderRepo.markWebhookProcessed(eventId);
      return ok({ skipped: true });
    }

    if (status === "pending") {
      await orderRepo.markWebhookProcessed(eventId);
      return ok({ status: "pending" });
    }

    if (status === "success") {
      await fulfillmentService.fulfillSuccessfulOrder(order.id, {
        providerRef: refId,
      });

      if (order.userId) {
        await checkAndUpgradeUserTier(order.userId).catch(() => {});
      }

      await orderRepo.markWebhookProcessed(eventId);
      return ok({ status: "success" });
    }

    if (order.paymentMethod === "WALLET" && order.userId) {
      await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
        providerRef: refId,
        notes: `AgenH2H webhook: failed | ${data?.message || data?.status || "No message"}`,
      });
      await orderRepo.releaseWalletHold(order.userId, Number(order.amount), order.id);
    } else if (order.paymentMethod === "PAYMENT_GATEWAY" && order.userId) {
      await orderRepo.refundPaidOrderToWallet(order.userId, Number(order.amount), order.id);
      await orderRepo.updateStatus(order.id, OrderStatus.REFUNDED, {
        providerRef: refId,
        notes: `AgenH2H webhook: failed | ${data?.message || data?.status || "No message"} Dana otomatis dikembalikan ke saldo akun.`,
      });
    } else {
      await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
        providerRef: refId,
        notes: `AgenH2H webhook: failed | ${data?.message || data?.status || "No message"} Pembayaran sudah diterima. Hubungi CS untuk refund manual.`,
      });
    }

    await orderRepo.markWebhookProcessed(eventId);
    return ok({ status: "failed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    await orderRepo.markWebhookProcessed(eventId, message).catch(() => {});
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
