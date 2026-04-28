import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

type InputFieldDef = {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  width: "flex" | "fixed";
};

const DEFAULT_GAME_INPUT_FIELDS: InputFieldDef[] = [
  {
    key: "userId",
    label: "User ID",
    placeholder: "Masukkan User ID",
    required: true,
    width: "flex",
  },
];

function isGameLikeValue(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return false;

  return /(game|joki|diamond|membership|server|zone|uid|user id|game id)/i.test(
    normalized
  );
}

function buildSingleTargetField(brand: string, categories: string[]): InputFieldDef {
  const joined = `${brand} ${categories.join(" ")}`.toLowerCase();
  const isPhoneLike = /(pulsa|data|paket data|voucher data|telkomsel|indosat|xl|axis|tri|three|smartfren|by\.u|token listrik|pln)/i.test(
    joined
  );

  if (isPhoneLike) {
    return {
      key: "targetNumber",
      label: "Nomor Tujuan",
      placeholder: "Masukkan nomor tujuan",
      required: true,
      width: "flex",
    };
  }

  return {
    key: "targetNumber",
    label: "Tujuan",
    placeholder: "Masukkan tujuan / nomor akun",
    required: true,
    width: "flex",
  };
}

/**
 * GET /api/catalog/brands/[brand]/products
 * Return merchant-selected products for a specific brand slug (public, no auth).
 * Brand remains public even when no merchant has listed products yet.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brand: string }> }
) {
  try {
    const { brand: brandSlug } = await params;

    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: true,
      },
      select: {
        brand: true,
      },
      distinct: ["brand"],
    });

    const allBrands = allProducts.map((item) => item.brand);

    const matchedBrand = allBrands.find((brand) => {
      const slug = brand
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return slug === brandSlug;
    });

    if (!matchedBrand) {
      return NextResponse.json(
        { success: false, error: "Brand tidak ditemukan." },
        { status: 404 }
      );
    }

    const brandMeta = await prisma.brandMeta.findUnique({
      where: { brand: matchedBrand },
      select: { imageUrl: true, inputFields: true },
    });

    const products = await prisma.sellerProduct.findMany({
      where: {
        isActive: true,
        seller: {
          sellerProfile: {
            isActive: true,
          },
        },
        product: {
          brand: matchedBrand,
          isActive: true,
          stock: true,
        },
      },
      include: {
        product: true,
        seller: {
          select: {
            sellerProfile: {
              select: {
                displayName: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const productsData = products
      .map((item) => {
        const merchantSellingPrice = item.sellingPrice !== null
          ? Number(item.sellingPrice)
          : Number(item.product.sellingPrice);

        return {
          id: item.product.id,
          sellerProductId: item.id,
          merchantName: item.seller.sellerProfile?.displayName ?? "Merchant",
          merchantSlug: item.seller.sellerProfile?.slug ?? null,
          providerCode: item.product.providerCode,
          name: item.product.name,
          category: item.product.category,
          brand: item.product.brand,
          type: item.product.type,
          providerPrice: Number(item.product.providerPrice),
          sellingPrice: merchantSellingPrice,
          discount: Number(item.product.providerPrice) > merchantSellingPrice
            ? Math.round(((Number(item.product.providerPrice) - merchantSellingPrice) / Number(item.product.providerPrice)) * 100)
            : 0,
          description: item.product.description,
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        if (a.sellingPrice !== b.sellingPrice) return a.sellingPrice - b.sellingPrice;
        return a.name.localeCompare(b.name);
      });

    const typeGroups: Record<string, typeof productsData> = {};
    productsData.forEach((p) => {
      if (!typeGroups[p.type]) typeGroups[p.type] = [];
      typeGroups[p.type].push(p);
    });

    const brandCategories = Array.from(
      new Set(productsData.map((item) => item.category).filter(Boolean))
    );
    const hasGameLikeProducts = productsData.some(
      (item) => isGameLikeValue(item.type) || isGameLikeValue(item.category)
    );
    const resolvedInputFields =
      hasGameLikeProducts
        ? ((brandMeta?.inputFields as InputFieldDef[] | null) ?? DEFAULT_GAME_INPUT_FIELDS)
        : [buildSingleTargetField(matchedBrand, brandCategories)];

    return NextResponse.json({
      success: true,
      brand: matchedBrand,
      imageUrl: brandMeta?.imageUrl ?? null,
      inputFields: resolvedInputFields,
      hasMerchantProducts: productsData.length > 0,
      types: Object.keys(typeGroups),
      data: productsData,
      grouped: typeGroups,
    });
  } catch (error) {
    console.error("[CATALOG BRAND PRODUCTS ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat produk." },
      { status: 500 }
    );
  }
}
