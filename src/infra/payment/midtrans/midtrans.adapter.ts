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
  order_id?: string;
  transaction_id?: string;
  transaction_status?: string;
  payment_type?: string;
  status_message?: string;
  token?: string;
  redirect_url?: string;
  qr_string?: string;
  qr_code_url?: string;
  actions?: Array<{
    name?: string;
    method?: string;
    url?: string;
  }>;
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
  status_message?: string;
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
    const amount = Math.round(input.amount);
    const feeConfig = await getPaymentGatewayFeeConfig(method ?? "qris");
    const fee = Math.round(calculatePaymentGatewayFee(method ?? "qris", amount, feeConfig));
    const totalPayment = Math.round(amount + fee);
    const siteName = await getSiteName();
    const transactionDetails = {
      order_id: input.orderId,
      gross_amount: totalPayment,
    };
    const itemDetails = buildItemDetails(input, fee);
    const customerDetails = {
      first_name: input.payerName?.trim() || `${siteName} Customer`,
      email: input.payerEmail?.trim() || undefined,
    };

    const isQris = method === "qris";

    let paymentResponse = isQris
      ? await this.postMidtransCreate(`${await this.getApiBaseUrl()}/v2/charge`, {
          payment_type: "qris",
          transaction_details: transactionDetails,
          item_details: itemDetails,
          customer_details: customerDetails,
        })
      : await this.createSnapPayment({
          transactionDetails,
          itemDetails,
          customerDetails,
          method,
          redirectUrl: input.redirectUrl,
        });

    if (isQris && isMidtransChannelInactive(paymentResponse.raw, paymentResponse.rawText)) {
      paymentResponse = await this.createSnapPayment({
        transactionDetails,
        itemDetails,
        customerDetails,
        method,
        redirectUrl: input.redirectUrl,
      });
    }

    const { response, raw, rawText } = paymentResponse;
    const qrisImageUrl = findMidtransActionUrl(raw.actions, "generate-qr-code");
    const paymentUrl = isQris ? qrisImageUrl ?? raw.qr_code_url ?? raw.redirect_url ?? "" : raw.redirect_url ?? "";

    if (!response.ok || (!paymentUrl && !raw.qr_string)) {
      throw new Error(formatMidtransError(raw, rawText, `Midtrans create payment failed (${response.status})`));
    }

    return {
      invoiceId: raw.order_id ?? input.orderId,
      paymentUrl,
      paymentNumber: raw.qr_string,
      method: method ?? input.method ?? "all",
      amount,
      fee,
      totalPayment,
      expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      raw,
    };
  }

  private async createSnapPayment(input: {
    transactionDetails: { order_id: string; gross_amount: number };
    itemDetails: ReturnType<typeof buildItemDetails>;
    customerDetails: { first_name: string; email?: string };
    method?: string;
    redirectUrl?: string;
  }) {
    return this.postMidtransCreate(`${await this.getSnapBaseUrl()}/snap/v1/transactions`, {
      transaction_details: input.transactionDetails,
      item_details: input.itemDetails,
      customer_details: input.customerDetails,
      enabled_payments: input.method ? [input.method] : undefined,
      callbacks: input.redirectUrl ? { finish: input.redirectUrl } : undefined,
    });
  }

  private async postMidtransCreate(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: await this.getAuthorizationHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    const raw = parseMidtransResponse<MidtransCreateResponse>(rawText);
    return { response, raw, rawText };
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

    const rawText = await response.text();
    const raw = parseMidtransResponse<MidtransStatusResponse>(rawText);
    if (!response.ok) {
      throw new Error(formatMidtransError(raw, rawText, `Midtrans status check failed (${response.status})`));
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
    if (configured.trim()) return normalizeMidtransBaseUrl(configured, "snap");
    return (await this.getMode()) === "production"
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";
  }

  private async getApiBaseUrl(): Promise<string> {
    const configured = await getSiteConfigValue("MIDTRANS_API_BASE_URL");
    if (configured.trim()) return normalizeMidtransBaseUrl(configured, "api");
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
  const amount = Math.round(input.amount);
  const roundedFee = Math.round(fee);
  const items = [
    {
      id: "product",
      price: amount,
      quantity: 1,
      name: (input.description || input.orderId).slice(0, 50),
    },
  ];

  if (roundedFee > 0) {
    items.push({
      id: "admin_fee",
      price: roundedFee,
      quantity: 1,
      name: "Biaya admin",
    });
  }

  return items;
}

function findMidtransActionUrl(
  actions: MidtransCreateResponse["actions"],
  preferredName: string
): string | undefined {
  if (!actions?.length) return undefined;

  return (
    actions.find((action) => action.name === preferredName)?.url ??
    actions.find((action) => action.url)?.url
  );
}

function parseMidtransResponse<T>(rawText: string): T {
  if (!rawText.trim()) return {} as T;

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return {} as T;
  }
}

function formatMidtransError(
  raw: Pick<MidtransCreateResponse, "error_messages" | "status_message">,
  rawText: string,
  fallback: string
): string {
  const message = raw.error_messages?.join(", ") || raw.status_message;
  if (message) return message;

  const snippet = rawText.replace(/\s+/g, " ").trim().slice(0, 180);
  return snippet ? `${fallback}: ${snippet}` : fallback;
}

function isMidtransChannelInactive(
  raw: Pick<MidtransCreateResponse, "error_messages" | "status_message">,
  rawText: string
): boolean {
  const message = [
    raw.status_message,
    ...(raw.error_messages ?? []),
    rawText,
  ].join(" ").toLowerCase();

  return message.includes("payment channel is not activated");
}

function normalizeMidtransBaseUrl(rawUrl: string, target: "api" | "snap"): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    if (target === "api") {
      if (hostname === "app.midtrans.com") return "https://api.midtrans.com";
      if (hostname === "app.sandbox.midtrans.com") return "https://api.sandbox.midtrans.com";
      if (hostname === "api.midtrans.com" || hostname === "api.sandbox.midtrans.com") return url.origin;
    }

    if (hostname === "api.midtrans.com") return "https://app.midtrans.com";
    if (hostname === "api.sandbox.midtrans.com") return "https://app.sandbox.midtrans.com";
    if (hostname === "app.midtrans.com" || hostname === "app.sandbox.midtrans.com") return url.origin;

    return url.origin;
  } catch {
    return trimmed;
  }
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
