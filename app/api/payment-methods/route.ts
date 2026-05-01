import { NextResponse } from "next/server";
import { getPaymentGatewayFeeConfig } from "@/lib/site-config";
import { prisma } from "@/src/infra/db/prisma";
import { getDefaultPaymentMethodSeeds, isStorefrontSupportedPaymentMethodKey } from "@/src/infra/payment/payment-methods.config";

export const dynamic = "force-dynamic";

/**
 * GET /api/payment-methods
 * Returns active storefront payment methods from DB, seeding current defaults if empty.
 * Storefront currently exposes only methods supported by the active checkout flow.
 */
export async function GET() {
  try {
    const feeConfig = await getPaymentGatewayFeeConfig("qris");
    await prisma.paymentMethod.createMany({
      data: getDefaultPaymentMethodSeeds(),
      skipDuplicates: true,
    });

    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, key: true, label: true, group: true, imageUrl: true },
    });

    const storefrontMethods = methods.filter((item) => isStorefrontSupportedPaymentMethodKey(item.key));

    return NextResponse.json({
      success: true,
      gateway: "MULTI",
      feeConfig,
      data: storefrontMethods,
    });
  } catch (error) {
    console.error("[PAYMENT METHODS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat metode pembayaran." }, { status: 500 });
  }
}
