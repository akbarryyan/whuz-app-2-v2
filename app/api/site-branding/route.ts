import { NextResponse } from "next/server";
import { getSiteConfig, getSiteName } from "@/lib/site-config";

/**
 * GET /api/site-branding — public endpoint returning site identity (logo, name, etc.)
 */
export async function GET() {
  const [siteName, siteLogo] = await Promise.all([
    getSiteName(),
    getSiteConfig("site_logo"),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      site_name: siteName,
      site_logo: siteLogo || "",
    },
  });
}
