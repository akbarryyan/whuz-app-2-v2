/**
 * GET /api/banners
 * Public endpoint — returns banner image URLs for the home carousel.
 */

import { NextResponse } from "next/server";
import { getBannerImages, getSiteConfig, getSiteName } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const [images, tagline, siteName] = await Promise.all([
    getBannerImages(),
    getSiteConfig("banner_tagline"),
    getSiteName(),
  ]);
  return NextResponse.json({
    success: true,
    data: images,
    tagline:
      tagline || `${siteName} - Tempat Top Up Game dan Jual Beli Produk Digital Terpercaya`,
  });
}
