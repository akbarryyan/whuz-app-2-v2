import { NextResponse } from "next/server";
import {
  getPoppayDebugConfigSummary,
  PoppayClient,
} from "@/src/infra/payment/poppay/poppay.client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getPoppayDebugConfigSummary();
    const missing: string[] = [];

    if (!summary.baseUrl) missing.push("POPPAY_API_BASE_URL atau POPPAY_URL/POPPAY_PORT");
    if (!summary.versionPath) missing.push("POPPAY_VERSION");
    if (!summary.hasIntegratorToken) missing.push("POPPAY_INTEGRATOR_TOKEN");
    if (!summary.hasAggregatorCode) missing.push("POPPAY_AGGREGATOR_CODE");
    if (!summary.hasMerchantAccountNumber) missing.push("POPPAY_MERCHANT_ACCOUNT_NUMBER");
    if (!summary.hasSecretKey) missing.push("POPPAY_SECRET_KEY");
    if (!summary.hasEmail) missing.push("POPPAY_EMAIL");
    if (!summary.hasPassword) missing.push("POPPAY_PASSWORD");

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          stage: "config",
          error: "Konfigurasi Poppay belum lengkap.",
          missing,
          config: summary,
        },
        { status: 400 }
      );
    }

    const client = new PoppayClient();
    const auth = await client.testAuth();

    return NextResponse.json({
      success: true,
      stage: "auth",
      message: "Login Poppay berhasil.",
      config: summary,
      data: auth,
    });
  } catch (error) {
    console.error("[POPPAY AUTH DEBUG ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        stage: "auth",
        error: error instanceof Error ? error.message : "Gagal login ke Poppay.",
      },
      { status: 502 }
    );
  }
}
