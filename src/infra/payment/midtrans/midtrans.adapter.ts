import crypto from "crypto";
import {
  CreatePaymentInput,
  CreatePaymentResult,
  DetailPaymentResult,
  IPaymentGatewayPort,
} from "@/src/core/ports/payment-gateway.port";
import { calculatePaymentGatewayFee } from "@/lib/payment-gateway-fee";
import { getPaymentGatewayFeeConfig, getSiteConfigValue, getSiteName } from "@/lib/site-config";

type MidtransMode = "sandbox" | "production";

interface MidtransCreateResponse {
  token?: string;
  redirect_url?: string;
  error_messages?: string[];
}

interface MidtransStatusResponse {
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  gross_amount?: string;
  payment_type?: string;
  status_code?: string;
  settlement_time?: string;
  transaction_time?: string;
  expiry_time?: string;
  va_numbers?: Array<{ bank?: string; va_number?: string }>;
  permata_va_number?: string;
  qr_string?: string;
  error_messages?: string[];
}

export async function getMidtransMode(): Promise<MidtransMode> {
  const value = (await getSiteConfigValue("MIDTRANS_MODE", "sandbox")).toLowerCase();
  return value === "production" ? "production" : "sandbox";
}

export async function isMidtransConfigured(): Promise<boolean> {
  const serverKey = await getSiteConfigValue("MIDTRANS_SERVER_KEY");
  return serverKey.trim().length > 0;
}

export class MidtransAdapter implements IPaymentGatewayPort {
  gatewayName = "MIDTRANS";

  constructor(private readonly mode?: MidtransMode) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const method = normalizeMidtransMethod(input.method);
    const feeConfig = await getPaymentGatewayFeeConfig(method ?? "qris");
    const fee = calculatePaymentGatewayFee(method ?? "qris", input.amount, feeConfig);
    const totalPayment = input.amount + fee;
    const siteName = await getSiteName();

    const response = await fetch(`${await this.getSnapBaseUrl()}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: await this.getAuthorizationHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: input.orderId,
          gross_amount: totalPayment,
        },
        item_details: buildItemDetails(input, fee),
        customer_details: {
          first_name: input.payerName?.trim() || `${siteName} Customer`,
          email: input.payerEmail?.trim() || undefined,
        },
        enabled_payments: method ? [method] : undefined,
        callbacks: input.redirectUrl ? { finish: input.redirectUrl } : undefined,
      }),
    });

    const raw = (await response.json().catch(() => ({}))) as MidtransCreateResponse;
    if (!response.ok || !raw.redirect_url) {
      throw new Error(raw.error_messages?.join(", ") || `Midtrans create payment failed (${response.status})`);
    }

    return {
      invoiceId: input.orderId,
      paymentUrl: raw.redirect_url,
      paymentNumber: undefined,
      method: method ?? input.method ?? "all",
      amount: input.amount,
      fee,
      totalPayment,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      raw,
    };
  }

  async detailPayment(orderId: string, amount: number): Promise<DetailPaymentResult> {
    const raw = await this.getStatus(orderId);
    const totalPayment = Number(raw.gross_amount ?? amount);
    const fee = Math.max(0, totalPayment - amount);

    return {
      invoiceId: raw.transaction_id ?? raw.order_id ?? orderId,
      orderId: raw.order_id ?? orderId,
      status: mapMidtransStatus(raw),
      amount,
      fee,
      totalPayment,
      paidAt: raw.settlement_time ? new Date(raw.settlement_time) : raw.transaction_time ? new Date(raw.transaction_time) : undefined,
      method: normalizeMidtransPaymentLabel(raw),
      raw,
    };
  }

  async cancelPayment(orderId: string, _amount: number): Promise<void> {
    void _amount;
    const response = await fetch(`${await this.getApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
      headers: {
        Authorization: await this.getAuthorizationHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const raw = (await response.json().catch(() => ({}))) as MidtransStatusResponse;
      throw new Error(raw.error_messages?.join(", ") || `Midtrans cancel failed (${response.status})`);
    }
  }

  async simulatePayment(
    _orderId: string,
    _amount: number,
    _status: "completed" | "expired" = "completed"
  ): Promise<void> {
    void _orderId;
    void _amount;
    void _status;
    throw new Error("simulatePayment tidak didukung untuk Midtrans.");
  }

  async getStatus(orderId: string): Promise<MidtransStatusResponse> {
    const response = await fetch(`${await this.getApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
      method: "GET",
      headers: {
        Authorization: await this.getAuthorizationHeader(),
        Accept: "application/json",
      },
    });

    const raw = (await response.json().catch(() => ({}))) as MidtransStatusResponse;
    if (!response.ok) {
      throw new Error(raw.error_messages?.join(", ") || `Midtrans status check failed (${response.status})`);
    }
    return raw;
  }

  async verifySignature(payload: {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
  }): Promise<boolean> {
    if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
      return false;
    }

    const serverKey = await this.getServerKey();
    const signature = crypto
      .createHash("sha512")
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
      .digest("hex");

    return signature === payload.signature_key;
  }

  private async getMode(): Promise<MidtransMode> {
    return this.mode ?? getMidtransMode();
  }

  private async getSnapBaseUrl(): Promise<string> {
    const configured = await getSiteConfigValue("MIDTRANS_SNAP_BASE_URL");
    if (configured.trim()) return configured.replace(/\/+$/, "");
    return (await this.getMode()) === "production"
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";
  }

  private async getApiBaseUrl(): Promise<string> {
    const configured = await getSiteConfigValue("MIDTRANS_API_BASE_URL");
    if (configured.trim()) return configured.replace(/\/+$/, "");
    return (await this.getMode()) === "production"
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com";
  }

  private async getAuthorizationHeader(): Promise<string> {
    const serverKey = await this.getServerKey();
    return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
  }

  private async getServerKey(): Promise<string> {
    const serverKey = await getSiteConfigValue("MIDTRANS_SERVER_KEY");
    if (!serverKey.trim()) {
      throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
    }
    return serverKey.trim();
  }
}

function normalizeMidtransMethod(method?: string): string | undefined {
  const value = method?.trim().toLowerCase();
  if (!value || value === "all") return undefined;
  if (value === "va_bca") return "bca_va";
  if (value === "va_bni") return "bni_va";
  if (value === "va_bri") return "bri_va";
  return value;
}

function buildItemDetails(input: CreatePaymentInput, fee: number) {
  const items = [
    {
      id: "product",
      price: input.amount,
      quantity: 1,
      name: (input.description || input.orderId).slice(0, 50),
    },
  ];

  if (fee > 0) {
    items.push({
      id: "admin_fee",
      price: fee,
      quantity: 1,
      name: "Biaya admin",
    });
  }

  return items;
}

export function mapMidtransStatus(raw: Pick<MidtransStatusResponse, "transaction_status" | "fraud_status">): DetailPaymentResult["status"] {
  const status = raw.transaction_status;
  if (status === "settlement") return "completed";
  if (status === "capture") return raw.fraud_status === "challenge" ? "pending" : "completed";
  if (status === "pending") return "pending";
  if (status === "expire" || status === "cancel") return "expired";
  return "failed";
}

function normalizeMidtransPaymentLabel(raw: MidtransStatusResponse): string | undefined {
  if (raw.va_numbers?.[0]?.bank) return `${raw.va_numbers[0].bank}_va`;
  if (raw.permata_va_number) return "permata_va";
  return raw.payment_type;
}
