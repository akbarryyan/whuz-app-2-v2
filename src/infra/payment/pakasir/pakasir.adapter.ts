import { Pakasir, type PaymentMethod as PakasirMethod } from "pakasir-sdk";
import {
  IPaymentGatewayPort,
  CreatePaymentInput,
  CreatePaymentResult,
  DetailPaymentResult,
} from "@/src/core/ports/payment-gateway.port";

/**
 * Pakasir Payment Gateway Adapter
 *
 * Implements IPaymentGatewayPort menggunakan pakasir-sdk.
 * https://pakasir.com / https://github.com/zeative/pakasir-sdk
 *
 * Required env:
 *   PAKASIR_SLUG     — project slug (contoh: whuzpay)
 *   PAKASIR_API_KEY  — API key
 */
export class PakasirAdapter implements IPaymentGatewayPort {
  gatewayName = "PAKASIR";
  private readonly client: Pakasir;
  private readonly mode: "sandbox" | "production";

  /**
   * @param mode "sandbox" (default) — pakai PAKASIR_SANDBOX_SLUG/KEY
   *             "production"         — pakai PAKASIR_SLUG/KEY
   * Kedua mode memanggil API Pakasir yang nyata.
   */
  constructor(mode: "sandbox" | "production" = "sandbox") {
    this.mode = mode;

    const slug =
      mode === "production"
        ? (process.env.PAKASIR_SLUG ?? "")
        : (process.env.PAKASIR_SANDBOX_SLUG ?? process.env.PAKASIR_SLUG ?? "");

    const apikey =
      mode === "production"
        ? (process.env.PAKASIR_API_KEY ?? "")
        : (process.env.PAKASIR_SANDBOX_API_KEY ?? process.env.PAKASIR_API_KEY ?? "");

    if (!slug || !apikey) {
      console.warn(`[Pakasir:${mode}] PAKASIR_SLUG atau PAKASIR_API_KEY belum diset di .env`);
    }

    this.client = new Pakasir({ slug, apikey });
  }

  // ── IPaymentGatewayPort ──────────────────────────────────────────────────

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const method = (input.method ?? "all") as PakasirMethod;
    const raw = await this.client.createPayment(
      method,
      input.orderId,
      input.amount,
      input.redirectUrl
    );

    const fee = Number(raw.fee ?? 0);
    const totalPayment = Number(raw.total_payment ?? input.amount + fee);

    return {
      invoiceId: String(raw.order_id),
      paymentUrl: raw.payment_url ?? "",
      paymentNumber: raw.payment_number ?? undefined,
      method: raw.payment_method ?? input.method,
      amount: input.amount,
      fee,
      totalPayment,
      expiredAt: raw.expired_at ? new Date(raw.expired_at) : undefined,
      raw,
    };
  }

  async detailPayment(orderId: string, amount: number): Promise<DetailPaymentResult> {
    const raw = await this.client.detailPayment(orderId, amount);

    const statusMap: Record<string, DetailPaymentResult["status"]> = {
      completed: "completed",
      pending: "pending",
      canceled: "expired",
      failed: "failed",
    };

    const status = statusMap[raw.status] ?? "pending";
    const fee = Number(raw.fee ?? 0);
    const totalPayment = Number(raw.total_payment ?? amount + fee);

    return {
      invoiceId: String(raw.order_id),
      orderId,
      status,
      amount: Number(raw.amount ?? amount),
      fee,
      totalPayment,
      paidAt: raw.completed_at ? new Date(raw.completed_at) : undefined,
      method: raw.payment_method ?? undefined,
      raw,
    };
  }

  async cancelPayment(orderId: string, amount: number): Promise<void> {
    await this.client.cancelPayment(orderId, amount);
  }

  /**
   * Simulate payment berhasil (dev/staging only — jangan pakai di production)
   */
  async simulatePayment(
    orderId: string,
    amount: number,
    // status param diabaikan karena SDK tidak mendukung param ini
    _status: "completed" | "expired" = "completed"
  ): Promise<void> {
    if (this.mode === "production") {
      throw new Error("simulatePayment tidak boleh dipanggil di mode production");
    }
    await this.client.simulationPayment(orderId, amount);
  }
}
