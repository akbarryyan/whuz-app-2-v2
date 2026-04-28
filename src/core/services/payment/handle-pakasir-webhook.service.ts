import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { IPaymentGatewayPort } from "@/src/core/ports/payment-gateway.port";
import { ExecuteProviderPurchaseService } from "@/src/core/services/provider/execute-provider-purchase.service";
import { OrderStatus, InvoiceStatus, WebhookSource } from "@/src/core/domain/enums/order.enum";
import { DuplicateWebhookError } from "@/src/core/domain/errors/domain.errors";

export interface PakasirWebhookPayload {
  /** Pakasir sends order_id we passed during createPayment */
  order_id: string;
  invoice_id?: string;
  status: string; // completed | pending | expired | failed
  amount: number | string;
  fee?: number | string;
  total_payment?: number | string;
  method?: string;
  paid_at?: string;
  [key: string]: any;
}

export interface WebhookHandleResult {
  duplicate: boolean;
  action: "executed" | "ignored" | "already_paid" | "execute_failed";
  orderId?: string;
  executeError?: string;
}

/**
 * HandlePakasirWebhookService
 *
 * Flow baru (tanpa BullMQ):
 * - Idempotent via WebhookEvent.eventId (deduplication).
 * - Cross-check dengan gateway detailPayment.
 * - Execute provider LANGSUNG (inline) saat PAID, bukan enqueue.
 * - Anti double-execute: ExecuteProviderPurchaseService punya atomic claim.
 */
export class HandlePakasirWebhookService {
  private readonly executeService: ExecuteProviderPurchaseService;

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: IPaymentGatewayPort,
  ) {
    this.executeService = new ExecuteProviderPurchaseService(orderRepo);
  }

  async handle(
    payload: PakasirWebhookPayload,
    rawBody: string
  ): Promise<WebhookHandleResult> {
    // ── Derive stable event ID ──────────────────────────────────────────────
    const eventId = `pakasir:${payload.order_id}:${payload.status}`;

    // ── Idempotency check ───────────────────────────────────────────────────
    const { event, duplicate } = await this.orderRepo.findOrCreateWebhookEvent({
      source: WebhookSource.PAKASIR,
      eventId,
      eventType: payload.status,
      payload: JSON.parse(rawBody),
    });

    if (duplicate) {
      console.log(`[Webhook/Pakasir] Duplicate event ${eventId} — skipping`);
      return { duplicate: true, action: "ignored" };
    }

    try {
      const result = await this.processWebhook(payload);
      await this.orderRepo.markWebhookProcessed(eventId);
      return { ...result, duplicate: false };
    } catch (err: any) {
      await this.orderRepo.markWebhookProcessed(eventId, err.message);
      throw err;
    }
  }

  private async processWebhook(
    payload: PakasirWebhookPayload
  ): Promise<Omit<WebhookHandleResult, "duplicate">> {
    // Only process "completed" — ignore pending/expired/failed (nothing to do)
    if (payload.status !== "completed") {
      console.log(`[Webhook/Pakasir] Status=${payload.status} — no action`);
      return { action: "ignored" };
    }

    // ── Find order by order_code ────────────────────────────────────────────
    const order = await this.orderRepo.findByCode(payload.order_id);

    if (!order) {
      console.error(`[Webhook/Pakasir] Order ${payload.order_id} not found`);
      return { action: "ignored" };
    }

    // ── Already paid guard ──────────────────────────────────────────────────
    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.PROCESSING_PROVIDER ||
      order.status === OrderStatus.SUCCESS
    ) {
      console.log(`[Webhook/Pakasir] Order ${order.id} already past WAITING_PAYMENT`);
      return { action: "already_paid", orderId: order.id };
    }

    // ── Cross-check with gateway (constitution §6.1) ────────────────────────
    const amount = Number(payload.amount);
    let detail;
    try {
      detail = await this.paymentGateway.detailPayment(payload.order_id, amount);
    } catch (err: any) {
      throw new Error(`detailPayment failed: ${err.message}`);
    }

    if (detail.status !== "completed") {
      console.warn(
        `[Webhook/Pakasir] detailPayment returned status=${detail.status} for ${payload.order_id}. Ignoring.`
      );
      return { action: "ignored" };
    }

    // ── Mark invoice PAID ───────────────────────────────────────────────────
    if (order.paymentInvoice) {
      await this.orderRepo.updateInvoiceStatus(
        order.paymentInvoice.invoiceId,
        InvoiceStatus.PAID,
        {
          paidAt: detail.paidAt ?? new Date(),
          rawPayload: payload,
        }
      );
    }

    // ── Transition order to PAID ────────────────────────────────────────────
    await this.orderRepo.updateStatus(order.id, OrderStatus.PAID);

    // ── Execute provider LANGSUNG (inline) ──────────────────────────────────
    try {
      await this.executeService.execute(order.id);
      console.log(`[Webhook/Pakasir] Order ${order.id} marked PAID → provider executed langsung`);
      return { action: "executed" as const, orderId: order.id };
    } catch (execErr: any) {
      // Provider execution gagal tapi order tetap PAID — admin bisa reconcile
      console.error(`[Webhook/Pakasir] Order ${order.id} PAID tapi execute gagal:`, execErr.message);
      return { action: "execute_failed" as const, orderId: order.id, executeError: execErr.message };
    }
  }
}
