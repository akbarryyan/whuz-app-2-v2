/**
 * POST /api/dev/pakasir/simulate
 *
 * Development-only endpoint to simulate Pakasir payment completion.
 * Blocked in production.
 *
 * Body: { order_id: string, amount: number, status?: "completed" | "expired" }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { PakasirAdapter } from "@/src/infra/payment/pakasir/pakasir.adapter";

export const dynamic = "force-dynamic";

const Schema = z.object({
  order_id: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(["completed", "expired"]).default("completed"),
});

export async function POST(request: Request) {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation error", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const pakasir = new PakasirAdapter();
    await pakasir.simulatePayment(parsed.data.order_id, parsed.data.amount, parsed.data.status);
    return NextResponse.json({
      success: true,
      message: `Simulated ${parsed.data.status} for order ${parsed.data.order_id}`,
    });
  } catch (err: any) {
    console.error("[POST /api/dev/pakasir/simulate]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
