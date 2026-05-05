import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { matchesFrontendCategory, matchesFrontendTypeGroup } from "@/lib/frontend-category";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/brands?typeGroup=game
 * Return all public brands, enriched with merchant availability.
 * Optional ?typeGroup= to filter by product type group.
 * Optional ?category= to filter by exact manual category slug.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeGroup = searchParams.get("typeGroup") ?? undefined;
    const categorySlug = searchParams.get("category") ?? undefined;

    const [products, sellerProducts, brandCategories, selectedCategoryRows] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: true,
          stock: true,
        },
        select: {
          brand: true,
          type: true,
          category: true,
        },
      }),
      prisma.sellerProduct.findMany({
        where: {
          isActive: true,
          seller: {
            sellerProfile: {
              isActive: true,
            },
          },
          product: {
            isActive: true,
            stock: true,
          },
        },
        select: {
          product: {
            select: {
              brand: true,
              type: true,
              category: true,
            },
          },
        },
      }),
      prisma.$queryRaw<Array<{ brand: string; category: string | null }>>`
        SELECT bm.brand, mc.name AS category
        FROM brand_meta bm
        LEFT JOIN manual_categories mc ON mc.id = bm.manualCategoryId
      `,
      categorySlug
        ? prisma.$queryRaw<Array<{ name: string }>>`
            SELECT name
            FROM manual_categories
            WHERE slug = ${categorySlug}
            LIMIT 1
          `
        : Promise.resolve([]),
    ]);

    const selectedCategoryName = selectedCategoryRows[0]?.name ?? null;

    const brandCategoryMap = new Map<string, string | null>();
    for (const item of brandCategories) {
      brandCategoryMap.set(item.brand, item.category);
    }

    const filteredProducts = products.filter((item) => {
      if (selectedCategoryName) {
        return matchesFrontendCategory(selectedCategoryName, {
          category: item.category,
          brandCategory: brandCategoryMap.get(item.brand),
        });
      }
      if (!typeGroup) return true;
      return matchesFrontendTypeGroup(typeGroup, {
        type: item.type,
        category: item.category,
        brandCategory: brandCategoryMap.get(item.brand),
      });
    });

    const filteredSellerProducts = sellerProducts.filter((item) => {
      if (selectedCategoryName) {
        return matchesFrontendCategory(selectedCategoryName, {
          category: item.product.category,
          brandCategory: brandCategoryMap.get(item.product.brand),
        });
      }
      if (!typeGroup) return true;
      return matchesFrontendTypeGroup(typeGroup, {
        type: item.product.type,
        category: item.product.category,
        brandCategory: brandCategoryMap.get(item.product.brand),
      });
    });

    const merchantCounts = new Map<string, number>();
    for (const item of filteredSellerProducts) {
      const key = item.product.brand;
      merchantCounts.set(key, (merchantCounts.get(key) ?? 0) + 1);
    }

    const brandNames = Array.from(new Set(filteredProducts.map((item) => item.brand))).sort((a, b) => a.localeCompare(b));

    const metas = await prisma.brandMeta.findMany({
      where: { brand: { in: brandNames } },
      select: { brand: true, imageUrl: true },
    });
    const metaMap: Record<string, { imageUrl: string | null }> = {};
    for (const m of metas) metaMap[m.brand] = { imageUrl: m.imageUrl ?? null };

    const data = brandNames.map((brand) => ({
      brand,
      slug: brand
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      productCount: merchantCounts.get(brand) ?? 0,
      hasMerchantProducts: (merchantCounts.get(brand) ?? 0) > 0,
      imageUrl: metaMap[brand]?.imageUrl ?? null,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[CATALOG BRANDS ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat data brand." },
      { status: 500 }
    );
  }
}
