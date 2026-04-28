import {
  IPaymentGatewayPort,
  CreatePaymentInput,
  CreatePaymentResult,
  DetailPaymentResult,
} from "@/src/core/ports/payment-gateway.port";

/**
 * MockPakasirAdapter
 *
 * Simulasi payment gateway tanpa API call ke Pakasir.
 * Digunakan saat PROVIDER_PAKASIR_MODE = "mock" (dari DB atau .env).
 *
 * Behavior:
 *   - createPayment: langsung return mock invoice dengan paymentUrl simulasi
 *   - detailPayment: return status "pending" (webhook simulasi perlu di-trigger manual)
 *   - cancelPayment: no-op
 */
export class MockPakasirAdapter implements IPaymentGatewayPort {
  gatewayName = "PAKASIR";
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const delay = Number(process.env.MOCK_PROVIDER_DELAY_MS ?? 500);
    await new Promise((r) => setTimeout(r, delay));

    const method = input.method ?? "qris";
    const fee = this.mockFee(method, input.amount);
    const totalPayment = input.amount + fee;
    const invoiceId = `MOCK-${input.orderId}-${Date.now()}`;
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // paymentNumber: VA number for VA methods, QRIS string for QRIS
    const paymentNumber = method.endsWith("_va")
      ? `8080${Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000)}`
      : `00020101021226570014A93600013`; // mock QRIS prefix

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const qs = new URLSearchParams({
      amount: String(totalPayment),
      method,
      ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}),
    });

    return {
      invoiceId,
      paymentUrl: `${baseUrl}/mock-payment/${invoiceId}?${qs.toString()}`,
      paymentNumber,
      method,
      amount: input.amount,
      fee,
      totalPayment,
      expiredAt,
      raw: { mock: true, method, invoiceId },
    };
  }

  async detailPayment(orderId: string, amount: number): Promise<DetailPaymentResult> {
    const scenario = process.env.MOCK_PROVIDER_SCENARIO ?? "success";
    return {
      invoiceId: `MOCK-${orderId}`,
      orderId,
      status: scenario === "success" ? "completed" : "pending",
      amount,
      fee: 0,
      totalPayment: amount,
      paidAt: scenario === "success" ? new Date() : undefined,
      raw: { mock: true },
    };
  }

  async cancelPayment(_orderId: string, _amount: number): Promise<void> {
    // no-op in mock
  }

  async simulatePayment(
    _orderId: string,
    _amount: number,
    _status: "completed" | "expired" = "completed"
  ): Promise<void> {
    // In mock mode, simulate is a no-op (the mock detailPayment already returns configured scenario)
    const delay = Number(process.env.MOCK_PROVIDER_DELAY_MS ?? 300);
    await new Promise((r) => setTimeout(r, delay));
  }

  // ── Per-method mock fee ───────────────────────────────────────────────────
  private mockFee(method: string, amount: number): number {
    if (method === "qris") {
      return amount > 105000
        ? Math.ceil(amount * 0.01)
        : Math.ceil(amount * 0.007) + 310;
    }
    const va2500 = ["artha_graha_va", "sampoerna_va"];
    if (va2500.includes(method)) return 2500;
    if (method.endsWith("_va")) return 3500;
    return 0;
  }
}
