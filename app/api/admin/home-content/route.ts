/**
 * GET  /api/admin/home-content  — returns current game tags + FAQ
 * PUT  /api/admin/home-content  — replaces entire home content
 * DELETE /api/admin/home-content — resets to defaults
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getHomeContent, setHomeContent, deleteSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getHomeContent();
  return NextResponse.json({ success: true, data });
}

const GameTagSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

const FaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const PutSchema = z.object({
  gameTags: z.array(GameTagSchema),
  faqs: z.array(FaqSchema),
  aboutText: z.string().default(""),
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

  await setHomeContent(parsed.data);
  return NextResponse.json({ success: true, data: parsed.data });
}

export async function DELETE() {
  await deleteSiteConfig("HOME_CONTENT");
  const data = await getHomeContent(); // returns defaults
  return NextResponse.json({ success: true, data });
}
