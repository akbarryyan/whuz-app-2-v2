/**
 * GET /api/home-content — public, returns game tags + FAQ
 */
import { NextResponse } from "next/server";
import { getHomeContent } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getHomeContent();
  return NextResponse.json({ success: true, data });
}
