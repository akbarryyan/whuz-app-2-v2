import {
  CreatePaymentInput,
  CreatePaymentResult,
  DetailPaymentResult,
  IPaymentGatewayPort,
} from "@/src/core/ports/payment-gateway.port";
import { calculatePaymentGatewayFee } from "@/lib/payment-gateway-fee";
import { getPaymentGatewayFeeConfig, getSiteName } from "@/lib/site-config";
import { PoppayClient } from "@/src/infra/payment/poppay/poppay.client";

export class PoppayAdapter implements IPaymentGatewayPort {
  gatewayName = "POPPAY";

  constructor(private readonly client = new PoppayClient()) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const siteName = await getSiteName();
    const feeConfig = await getPaymentGatewayFeeConfig(input.method ?? "qris");
    const fee = calculatePaymentGatewayFee(input.method ?? "qris", input.amount, feeConfig);
    const incoming = await this.client.createIncoming({
      aggRefId: input.orderId,
      amount: input.amount,
      notes: input.orderId,
      payorName: input.payerName?.trim() || `${siteName} Customer`,
      payorEmail: input.payerEmail?.trim() || null,
      callbackUrl: this.resolveCallbackUrl(),
      expirationInterval: 30,
    });

    return {
      invoiceId: incoming.refId,
      paymentUrl: incoming.checkoutUrl,
      paymentNumber: incoming.rawQr,
      method: "qris",
      amount: input.amount,
      fee,
      totalPayment: input.amount + fee,
      expiredAt: incoming.expiredAt ? new Date(incoming.expiredAt) : undefined,
      raw: incoming,
    };
  }

  async detailPayment(orderId: string, amount: number): Promise<DetailPaymentResult> {
    const feeConfig = await getPaymentGatewayFeeConfig("qris");
    const fee = calculatePaymentGatewayFee("qris", amount, feeConfig);
    const inquiry = await this.client.inquireIncoming(orderId);
    return {
      invoiceId: orderId,
      orderId,
      status:
        inquiry.status === "unknown"
          ? "pending"
          : inquiry.status,
      amount,
      fee,
      totalPayment: amount + fee,
      method: "qris",
      raw: inquiry.raw,
    };
  }

  async cancelPayment(orderId: string, amount: number): Promise<void> {
    void orderId;
    void amount;
    // Poppay cancel endpoint belum tersedia di docs yang diberikan.
  }

  async simulatePayment(): Promise<void> {
    throw new Error("simulatePayment tidak didukung untuk Poppay.");
  }

  private resolveCallbackUrl(): string | null {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      "";

    if (!baseUrl) return null;
    return `${baseUrl.replace(/\/+$/, "")}/api/webhook/poppay`;
  }
}
