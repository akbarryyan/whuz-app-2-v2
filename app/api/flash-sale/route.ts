/**
 * GET /api/flash-sale
 * Public endpoint — returns flash sale config for the home page.
 */

import { NextResponse } from "next/server";
import { getFlashSaleConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getFlashSaleConfig();
  return NextResponse.json({ success: true, data: config });
}
