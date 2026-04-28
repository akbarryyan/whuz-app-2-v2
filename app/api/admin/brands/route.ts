import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/brands
 * List all distinct brands (from products) merged with their BrandMeta (imageUrl)
 */
export async function GET() {
  try {
    // All distinct brand names from active products
    const productBrands = await prisma.product.findMany({
      where: { isActive: true },
      select: { brand: true, category: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });

    // Fetch all BrandMeta
    const metas = await prisma.brandMeta.findMany({
      select: { brand: true, imageUrl: true, inputFields: true, updatedAt: true },
    });
    const metaMap: Record<string, { imageUrl: string | null; inputFields: unknown; updatedAt: Date }> = {};
    for (const m of metas) metaMap[m.brand] = { imageUrl: m.imageUrl ?? null, inputFields: m.inputFields ?? null, updatedAt: m.updatedAt };

    const data = productBrands.map((b) => ({
      brand: b.brand,
      category: b.category,
      slug: b.brand
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      imageUrl: metaMap[b.brand]?.imageUrl ?? null,
      inputFields: metaMap[b.brand]?.inputFields ?? null,
      updatedAt: metaMap[b.brand]?.updatedAt ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[ADMIN BRANDS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat brand." }, { status: 500 });
  }
}

/**
 * PUT /api/admin/brands
 * Upsert imageUrl for a brand
 * Body: { brand: string, imageUrl?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, imageUrl } = body as { brand: string; imageUrl?: string };

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    const meta = await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand, imageUrl: imageUrl || null },
      update: { imageUrl: imageUrl || null },
    });

    return NextResponse.json({ success: true, data: meta });
  } catch (error) {
    console.error("[ADMIN BRANDS PUT ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan data." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/brands
 * Upsert inputFields config for a brand
 * Body: { brand: string, inputFields: InputFieldDef[] }
 * InputFieldDef: { key: string, label: string, placeholder: string, required: boolean, width?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, inputFields } = body as { brand: string; inputFields: object[] | null };

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    const meta = await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand, inputFields: inputFields ?? [] },
      update: { inputFields: inputFields ?? [] },
    });

    return NextResponse.json({ success: true, data: meta });
  } catch (error) {
    console.error("[ADMIN BRANDS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan konfigurasi." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/brands/image
 * Clear imageUrl for a brand
 * Body: { brand: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand } = body as { brand: string };

    if (!brand) {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand, imageUrl: null },
      update: { imageUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN BRANDS DELETE ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus data." }, { status: 500 });
  }
}
