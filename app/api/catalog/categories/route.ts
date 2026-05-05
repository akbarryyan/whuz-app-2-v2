import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

interface PublicCategoryRow {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean | number;
  brandCount?: bigint | number;
}

export async function GET() {
  try {
    const [categories, brandCategories, products] = await Promise.all([
      prisma.$queryRaw<PublicCategoryRow[]>`
        SELECT id, name, slug, sortOrder, isActive
        FROM manual_categories
        WHERE isActive = true
        ORDER BY sortOrder ASC, name ASC
      `,
      prisma.$queryRaw<Array<{ brand: string; category: string | null }>>`
        SELECT bm.brand, mc.name AS category
        FROM brand_meta bm
        LEFT JOIN manual_categories mc ON mc.id = bm.manualCategoryId
      `,
      prisma.product.findMany({
        where: {
          isActive: true,
          stock: true,
        },
        select: {
          brand: true,
          category: true,
        },
      }),
    ]);

    const brandCategoryMap = new Map<string, string | null>();
    for (const item of brandCategories) {
      brandCategoryMap.set(item.brand, item.category);
    }

    return NextResponse.json({
      success: true,
      data: categories
        .map((category) => {
          const brandNames = new Set(
            products
              .filter((product) => (brandCategoryMap.get(product.brand) ?? product.category) === category.name)
              .map((product) => product.brand)
          );

          return {
            id: category.id,
            label: category.name,
            value: category.slug,
            brandCount: brandNames.size,
          };
        })
        .filter((category) => category.brandCount > 0),
    });
  } catch (error) {
    console.error("[PUBLIC CATEGORIES ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat kategori." },
      { status: 500 }
    );
  }
}
