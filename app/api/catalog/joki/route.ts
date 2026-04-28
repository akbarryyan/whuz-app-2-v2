import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/joki
 * Return all active joki products grouped by brand (game).
 * Public — no auth required.
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { type: "joki", isActive: true, stock: true },
      orderBy: [{ brand: "asc" }, { sellingPrice: "asc" }],
      select: {
        id: true,
        providerCode: true,
        name: true,
        category: true,
        brand: true,
        type: true,
        providerPrice: true,
        sellingPrice: true,
        description: true,
      },
    });

    const productsData = products.map((p) => ({
      id: p.id,
      providerCode: p.providerCode,
      name: p.name,
      category: p.category,
      brand: p.brand,
      type: p.type,
      providerPrice: Number(p.providerPrice),
      sellingPrice: Number(p.sellingPrice),
      description: p.description,
    }));

    // Group by brand
    const grouped: Record<string, typeof productsData> = {};
    for (const p of productsData) {
      if (!grouped[p.brand]) grouped[p.brand] = [];
      grouped[p.brand].push(p);
    }

    // Fetch brand meta (imageUrl) for each brand
    const brandNames = Object.keys(grouped);
    const brandMetas = await prisma.brandMeta.findMany({
      where: { brand: { in: brandNames } },
      select: { brand: true, imageUrl: true },
    });
    const metaMap: Record<string, string | null> = {};
    for (const m of brandMetas) {
      metaMap[m.brand] = m.imageUrl;
    }

    const brands = brandNames.map((b) => ({
      name: b,
      imageUrl: metaMap[b] ?? null,
      productCount: grouped[b].length,
    }));

    return NextResponse.json({
      success: true,
      brands,
      products: productsData,
      grouped,
    });
  } catch (error) {
    console.error("[CATALOG JOKI ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat produk joki." },
      { status: 500 }
    );
  }
}
