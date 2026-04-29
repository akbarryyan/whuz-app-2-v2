import { NextResponse } from "next/server";
import {
  HandleMidtransWebhookService,
  type MidtransWebhookPayload,
} from "@/src/core/services/payment/handle-midtrans-webhook.service";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { MidtransAdapter, mapMidtransStatus } from "@/src/infra/payment/midtrans/midtrans.adapter";
import { handleWalletTopupWebhook } from "@/lib/wallet-topup-webhook";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let rawBody = "";
  let payload: MidtransWebhookPayload;

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody) as MidtransWebhookPayload;
  } catch {
    console.error("[Webhook/Midtrans] Failed to parse request body");
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 200 });
  }

  if (!payload.order_id || !payload.transaction_status) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 200 });
  }

  const gateway = new MidtransAdapter();
  const verified = await gateway.verifySignature(payload);
  if (!verified) {
    console.warn("[Webhook/Midtrans] Invalid signature");
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 200 });
  }

  if (payload.order_id.startsWith("WT-")) {
    try {
      const topup = await prisma.walletTopup.findUnique({ where: { topupCode: payload.order_id } });
      const status = mapMidtransStatus(payload);
      const result = await handleWalletTopupWebhook(
        {
          order_id: payload.order_id,
          status: status === "completed" ? "completed" : status,
          amount: Number(topup?.amount ?? payload.gross_amount ?? 0),
        },
        gateway
      );
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    } catch (error: unknown) {
      console.error("[Webhook/Midtrans] Wallet topup error:", error instanceof Error ? error.message : error);
      return NextResponse.json({ success: false, error: "Topup processing error" }, { status: 200 });
    }
  }

  try {
    const service = new HandleMidtransWebhookService(new OrderRepository(), gateway);
    const result = await service.handle(payload, rawBody);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Webhook/Midtrans] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: "Processing error" }, { status: 200 });
  }
}
