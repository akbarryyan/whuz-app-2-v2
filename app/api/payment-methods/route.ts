import { NextResponse } from "next/server";
import { getPaymentGatewayFeeConfig } from "@/lib/site-config";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_METHODS = [
  { key: "qris", label: "QRIS", group: "QRIS", imageUrl: null, sortOrder: 1 },
];

const STOREFRONT_SUPPORTED_KEYS = new Set(["qris"]);

/**
 * GET /api/payment-methods
 * Returns active storefront payment methods from DB, seeding current defaults if empty.
 * Storefront currently exposes only methods supported by the active checkout flow.
 */
export async function GET() {
  try {
    const feeConfig = await getPaymentGatewayFeeConfig("qris");
    const count = await prisma.paymentMethod.count();

    if (count === 0) {
      // Auto-seed default methods
      await prisma.paymentMethod.createMany({
        data: DEFAULT_METHODS.map((m) => ({ ...m, isActive: true })),
        skipDuplicates: true,
      });
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, key: true, label: true, group: true, imageUrl: true },
    });

    const storefrontMethods = methods.filter((item) => STOREFRONT_SUPPORTED_KEYS.has(item.key));

    const qrisMethod =
      storefrontMethods.find((item) => item.key === "qris") ??
      methods.find((item) => item.key === "qris") ?? {
        id: "poppay-qris",
        key: "qris",
        label: "QRIS",
        group: "QRIS",
        imageUrl: null,
      };

    return NextResponse.json({
      success: true,
      gateway: "POPPAY",
      feeConfig,
      data: storefrontMethods.length > 0 ? storefrontMethods : [qrisMethod],
    });
  } catch (error) {
    console.error("[PAYMENT METHODS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat metode pembayaran." }, { status: 500 });
  }
}
