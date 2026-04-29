import { IPaymentGatewayPort } from "@/src/core/ports/payment-gateway.port";
import { PakasirAdapter } from "@/src/infra/payment/pakasir/pakasir.adapter";
import { MidtransAdapter, isMidtransConfigured } from "@/src/infra/payment/midtrans/midtrans.adapter";
import { getPakasirMode, getSiteConfigValue } from "@/lib/site-config";

export type PaymentGatewayCode = "MIDTRANS" | "PAKASIR";

export interface ResolvedPaymentGateway {
  gateway: IPaymentGatewayPort;
  gatewayCode: PaymentGatewayCode;
  methodCode: string;
  methodKey: string;
}

const METHOD_ALIASES: Record<string, { gatewayCode: PaymentGatewayCode; methodCode: string }> = {
  midtrans_qris: { gatewayCode: "MIDTRANS", methodCode: "qris" },
  midtrans_gopay: { gatewayCode: "MIDTRANS", methodCode: "gopay" },
  midtrans_shopeepay: { gatewayCode: "MIDTRANS", methodCode: "shopeepay" },
  midtrans_bca_va: { gatewayCode: "MIDTRANS", methodCode: "bca_va" },
  midtrans_bni_va: { gatewayCode: "MIDTRANS", methodCode: "bni_va" },
  midtrans_bri_va: { gatewayCode: "MIDTRANS", methodCode: "bri_va" },
  midtrans_permata_va: { gatewayCode: "MIDTRANS", methodCode: "permata_va" },
  pakasir_all: { gatewayCode: "PAKASIR", methodCode: "all" },
  pakasir_qris: { gatewayCode: "PAKASIR", methodCode: "qris" },
};

export async function resolvePaymentGateway(methodKey?: string | null): Promise<ResolvedPaymentGateway> {
  const normalizedKey = normalizePaymentMethodKey(methodKey);
  const mapped = METHOD_ALIASES[normalizedKey] ?? await resolveFallbackMethod(normalizedKey);

  return {
    gateway: await createGateway(mapped.gatewayCode),
    gatewayCode: mapped.gatewayCode,
    methodCode: mapped.methodCode,
    methodKey: normalizedKey,
  };
}

export async function isPaymentGatewayConfigured(methodKey?: string | null): Promise<boolean> {
  const resolved = await resolvePaymentGateway(methodKey);
  if (resolved.gatewayCode === "MIDTRANS") return isMidtransConfigured();
  return isPakasirConfigured();
}

export function normalizePaymentMethodKey(methodKey?: string | null): string {
  return String(methodKey ?? "midtrans_qris").trim().toLowerCase() || "midtrans_qris";
}

async function resolveFallbackMethod(methodKey: string): Promise<{ gatewayCode: PaymentGatewayCode; methodCode: string }> {
  if (methodKey.startsWith("midtrans_")) {
    return { gatewayCode: "MIDTRANS", methodCode: methodKey.replace(/^midtrans_/, "") || "qris" };
  }

  if (methodKey.startsWith("pakasir_")) {
    return { gatewayCode: "PAKASIR", methodCode: methodKey.replace(/^pakasir_/, "") || "all" };
  }

  if (methodKey === "qris") {
    const defaultGateway = await getDefaultPaymentGateway();
    return {
      gatewayCode: defaultGateway,
      methodCode: defaultGateway === "PAKASIR" ? "qris" : "qris",
    };
  }

  if (methodKey === "all") {
    return { gatewayCode: "PAKASIR", methodCode: "all" };
  }

  const defaultGateway = await getDefaultPaymentGateway();
  return { gatewayCode: defaultGateway, methodCode: methodKey };
}

async function getDefaultPaymentGateway(): Promise<PaymentGatewayCode> {
  const value = (await getSiteConfigValue("PAYMENT_GATEWAY_DEFAULT", "MIDTRANS")).trim().toUpperCase();
  return value === "PAKASIR" ? "PAKASIR" : "MIDTRANS";
}

async function createGateway(gatewayCode: PaymentGatewayCode): Promise<IPaymentGatewayPort> {
  if (gatewayCode === "PAKASIR") {
    return new PakasirAdapter(await getPakasirMode());
  }
  return new MidtransAdapter();
}

async function isPakasirConfigured(): Promise<boolean> {
  const mode = await getPakasirMode();
  const [slug, apiKey] = await Promise.all([
    getSiteConfigValue(mode === "production" ? "PAKASIR_SLUG" : "PAKASIR_SANDBOX_SLUG"),
    getSiteConfigValue(mode === "production" ? "PAKASIR_API_KEY" : "PAKASIR_SANDBOX_API_KEY"),
  ]);

  if (mode === "sandbox") {
    const fallbackSlug = slug || await getSiteConfigValue("PAKASIR_SLUG");
    const fallbackApiKey = apiKey || await getSiteConfigValue("PAKASIR_API_KEY");
    return fallbackSlug.trim().length > 0 && fallbackApiKey.trim().length > 0;
  }

  return slug.trim().length > 0 && apiKey.trim().length > 0;
}
