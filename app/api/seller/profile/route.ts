import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";
import { slugifySellerName } from "@/lib/seller";

const SellerProfileSchema = z.object({
  displayName: z.string().min(3).max(120),
  slug: z.string().min(3).max(80).optional(),
  description: z.string().max(1000).optional(),
  profileImageUrl: z.string().url().max(2048).optional().or(z.literal("")),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  return NextResponse.json({
    success: true,
    data: profile,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
  }

  const parsed = SellerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const requestedSlug = slugifySellerName(parsed.data.slug || parsed.data.displayName);
  if (!requestedSlug) {
    return NextResponse.json({ success: false, error: "Slug seller tidak valid" }, { status: 422 });
  }

  try {
    const profile = await prisma.sellerProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        slug: requestedSlug,
        displayName: parsed.data.displayName.trim(),
        description: parsed.data.description?.trim() || null,
        profileImageUrl: parsed.data.profileImageUrl?.trim() || null,
        isActive: true,
      },
      update: {
        slug: requestedSlug,
        displayName: parsed.data.displayName.trim(),
        description: parsed.data.description?.trim() || null,
        profileImageUrl: parsed.data.profileImageUrl?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ success: false, error: "Slug seller sudah dipakai" }, { status: 409 });
    }

    console.error("[seller/profile POST]", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan profil seller" }, { status: 500 });
  }
}
