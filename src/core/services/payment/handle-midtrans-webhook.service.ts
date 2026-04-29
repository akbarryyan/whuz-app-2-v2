import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { IPaymentGatewayPort } from "@/src/core/ports/payment-gateway.port";
import { ExecuteProviderPurchaseService } from "@/src/core/services/provider/execute-provider-purchase.service";
import { InvoiceStatus, OrderStatus, WebhookSource } from "@/src/core/domain/enums/order.enum";
import { mapMidtransStatus } from "@/src/infra/payment/midtrans/midtrans.adapter";

export interface MidtransWebhookPayload {
  order_id: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  payment_type?: string;
  settlement_time?: string;
  transaction_time?: string;
  signature_key?: string;
  [key: string]: unknown;
}

export interface MidtransWebhookResult {
  duplicate: boolean;
  action: "executed" | "ignored" | "already_paid" | "expired_order" | "failed_order" | "execute_failed";
  orderId?: string;
  executeError?: string;
}

export class HandleMidtransWebhookService {
  private readonly executeService: ExecuteProviderPurchaseService;

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: IPaymentGatewayPort,
  ) {
    this.executeService = new ExecuteProviderPurchaseService(orderRepo);
  }

  async handle(payload: MidtransWebhookPayload, rawBody: string): Promise<MidtransWebhookResult> {
    const eventId = `midtrans:${payload.order_id}:${payload.transaction_status ?? "unknown"}:${payload.transaction_id ?? payload.status_code ?? ""}`;

    const { duplicate } = await this.orderRepo.findOrCreateWebhookEvent({
      source: WebhookSource.MIDTRANS,
      eventId,
      eventType: String(payload.transaction_status ?? "unknown"),
      payload: webhookJson(JSON.parse(rawBody)),
    });

    if (duplicate) {
      return { duplicate: true, action: "ignored" };
    }

    try {
      const result = await this.processWebhook(payload);
      await this.orderRepo.markWebhookProcessed(eventId);
      return { ...result, duplicate: false };
    } catch (error: unknown) {
      await this.orderRepo.markWebhookProcessed(
        eventId,
        error instanceof Error ? error.message : "Unknown webhook error"
      );
      throw error;
    }
  }

  private async processWebhook(
    payload: MidtransWebhookPayload
  ): Promise<Omit<MidtransWebhookResult, "duplicate">> {
    const order =
      await this.orderRepo.findByInvoiceId(payload.order_id) ??
      await this.orderRepo.findByCode(payload.order_id);

    if (!order || !order.paymentInvoice) {
      console.error(`[Webhook/Midtrans] Order/invoice ${payload.order_id} not found`);
      return { action: "ignored" };
    }

    const detail = await this.paymentGateway.detailPayment(
      order.paymentInvoice.invoiceId,
      Number(order.paymentInvoice.amount)
    );
    const status = detail.status || mapMidtransStatus(payload);

    if (status === "pending") {
      return { action: "ignored", orderId: order.id };
    }

    if (status === "expired" || status === "failed") {
      await this.orderRepo.updateInvoiceStatus(
        order.paymentInvoice.invoiceId,
        status === "expired" ? InvoiceStatus.EXPIRED : InvoiceStatus.CANCELLED,
        { rawPayload: webhookJson(payload) }
      );

      if (order.status === OrderStatus.WAITING_PAYMENT || order.status === OrderStatus.CREATED) {
        await this.orderRepo.updateStatus(
          order.id,
          status === "expired" ? OrderStatus.EXPIRED : OrderStatus.FAILED,
          { notes: `Midtrans payment ${status}` }
        );
      }

      return { action: status === "expired" ? "expired_order" : "failed_order", orderId: order.id };
    }

    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.PROCESSING_PROVIDER ||
      order.status === OrderStatus.SUCCESS
    ) {
      return { action: "already_paid", orderId: order.id };
    }

    await this.orderRepo.updateInvoiceStatus(
      order.paymentInvoice.invoiceId,
      InvoiceStatus.PAID,
      {
        paidAt: detail.paidAt ?? new Date(),
        rawPayload: webhookJson(payload),
      }
    );

    await this.orderRepo.updateStatus(order.id, OrderStatus.PAID);

    try {
      await this.executeService.execute(order.id);
      return { action: "executed", orderId: order.id };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown execute error";
      return { action: "execute_failed", orderId: order.id, executeError: message };
    }
  }
}

function webhookJson(value: unknown) {
  return value as Parameters<OrderRepository["findOrCreateWebhookEvent"]>[0]["payload"];
}
