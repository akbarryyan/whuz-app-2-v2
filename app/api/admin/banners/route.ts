/**
 * GET  /api/admin/banners  — returns current banner list
 * PUT  /api/admin/banners  — replaces entire banner list
 * DELETE /api/admin/banners — resets to default banners
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getBannerImages, setBannerImages } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const images = await getBannerImages();
  return NextResponse.json({ success: true, data: images });
}

const PutSchema = z.object({
  images: z.array(z.string().url("URL tidak valid")).min(1, "Minimal 1 banner"),
});

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation error", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  await setBannerImages(parsed.data.images);
  return NextResponse.json({ success: true, data: parsed.data.images });
}

export async function DELETE() {
  // Reset to built-in defaults by removing the DB record
  await setBannerImages([]);
  const images = await getBannerImages();
  return NextResponse.json({ success: true, data: images });
}
