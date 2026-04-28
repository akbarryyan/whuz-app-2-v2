export type PaymentGatewayFeeType = "FIXED" | "PERCENT";

export interface PaymentGatewayFeeConfig {
  type: PaymentGatewayFeeType;
  value: number;
}

export const DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG: PaymentGatewayFeeConfig = {
  type: "FIXED",
  value: 0,
};

export function normalizePaymentGatewayFeeType(value: string | null | undefined): PaymentGatewayFeeType {
  return value === "PERCENT" ? "PERCENT" : "FIXED";
}

export function normalizePaymentGatewayFeeConfig(
  config: Partial<PaymentGatewayFeeConfig> | null | undefined
): PaymentGatewayFeeConfig {
  const value = Number(config?.value ?? 0);

  return {
    type: normalizePaymentGatewayFeeType(config?.type),
    value: Number.isFinite(value) && value > 0 ? value : 0,
  };
}

export function calculatePaymentGatewayFee(
  methodKey: string | null | undefined,
  amount: number,
  config: Partial<PaymentGatewayFeeConfig> | null | undefined
): number {
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return 0;

  const normalizedMethod = String(methodKey ?? "").trim().toLowerCase();
  if (normalizedMethod && normalizedMethod !== "qris") return 0;

  const feeConfig = normalizePaymentGatewayFeeConfig(config);
  if (feeConfig.value <= 0) return 0;

  if (feeConfig.type === "PERCENT") {
    return Math.max(0, Math.ceil((normalizedAmount * feeConfig.value) / 100));
  }

  return Math.max(0, Math.round(feeConfig.value));
}
