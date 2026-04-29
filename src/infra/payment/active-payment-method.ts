import { prisma } from "@/src/infra/db/prisma";
import { normalizePaymentMethodKey } from "@/src/infra/payment/payment-gateway.factory";
import {
  getDefaultPaymentMethodSeeds,
  isStorefrontSupportedPaymentMethodKey,
} from "@/src/infra/payment/payment-methods.config";

export type ActivePaymentMethodResult =
  | { ok: true; methodKey: string; label: string }
  | { ok: false; error: string; status: number };

export async function resolveActiveStorefrontPaymentMethod(
  methodKey?: string | null
): Promise<ActivePaymentMethodResult> {
  const normalizedMethodKey = normalizePaymentMethodKey(methodKey);

  if (!isStorefrontSupportedPaymentMethodKey(normalizedMethodKey)) {
    return { ok: false, error: "Metode pembayaran tidak didukung.", status: 400 };
  }

  await prisma.paymentMethod.createMany({
    data: getDefaultPaymentMethodSeeds(),
    skipDuplicates: true,
  });

  const paymentMethod = await prisma.paymentMethod.findUnique({
    where: { key: normalizedMethodKey },
    select: { isActive: true, label: true },
  });

  if (!paymentMethod?.isActive) {
    return { ok: false, error: "Metode pembayaran sedang tidak aktif.", status: 400 };
  }

  return {
    ok: true,
    methodKey: normalizedMethodKey,
    label: paymentMethod.label,
  };
}
