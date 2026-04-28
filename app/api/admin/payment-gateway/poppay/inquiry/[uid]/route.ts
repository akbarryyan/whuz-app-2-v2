import { NextResponse } from "next/server";
import { isPoppayConfigured, PoppayClient } from "@/src/infra/payment/poppay/poppay.client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    if (!(await isPoppayConfigured())) {
      return NextResponse.json(
        {
          success: false,
          error: "Poppay belum terkonfigurasi di environment/database.",
        },
        { status: 400 }
      );
    }

    const { uid } = await params;
    const client = new PoppayClient();
    const data = await client.inquireIncoming(uid);

    return NextResponse.json({
      success: true,
      gateway: "POPPAY",
      data,
      note:
        data.status === "unknown"
          ? "Respons inquiry Poppay belum cukup jelas untuk dipetakan ke status internal. Perlu contoh respons real saat paid/pending."
          : undefined,
    });
  } catch (error) {
    console.error("[POPPAY INQUIRY ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gagal inquiry transaksi Poppay.",
      },
      { status: 502 }
    );
  }
}
