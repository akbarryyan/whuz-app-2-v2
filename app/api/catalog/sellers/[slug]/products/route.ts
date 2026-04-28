import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const seller = await prisma.sellerProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      description: true,
      profileImageUrl: true,
      isActive: true,
      userId: true,
    },
  });

  if (!seller || !seller.isActive) {
    return NextResponse.json({ success: false, error: "Seller tidak ditemukan" }, { status: 404 });
  }

  const products = await prisma.sellerProduct.findMany({
    where: {
      sellerId: seller.userId,
      isActive: true,
      product: {
        isActive: true,
        stock: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { brand: { contains: q } },
                { category: { contains: q } },
              ],
            }
          : {}),
      },
    },
    include: {
      product: true,
    },
    orderBy: [{ product: { brand: "asc" } }, { product: { name: "asc" } }],
    take: 300,
  });

  const brandNames = Array.from(new Set(products.map((item) => item.product.brand)));
  const brandMetas = await prisma.brandMeta.findMany({
    where: { brand: { in: brandNames } },
    select: { brand: true, imageUrl: true },
  });
  const brandImageMap: Record<string, string | null> = {};
  for (const meta of brandMetas) brandImageMap[meta.brand] = meta.imageUrl ?? null;

  return NextResponse.json({
    success: true,
    seller: {
      id: seller.id,
      slug: seller.slug,
      displayName: seller.displayName,
      description: seller.description,
      profileImageUrl: seller.profileImageUrl ?? null,
    },
    data: products.map((item) => ({
      sellerProductId: item.id,
      sellingPrice: item.sellingPrice !== null ? Number(item.sellingPrice) : Number(item.product.sellingPrice),
      commissionType: item.commissionType,
      commissionValue: Number(item.commissionValue),
      feeType: item.feeType,
      feeValue: Number(item.feeValue),
      product: {
        id: item.product.id,
        provider: item.product.provider,
        providerCode: item.product.providerCode,
        name: item.product.name,
        brand: item.product.brand,
        brandImageUrl: brandImageMap[item.product.brand] ?? null,
        category: item.product.category,
        type: item.product.type,
        providerPrice: Number(item.product.providerPrice),
        sellingPrice: item.sellingPrice !== null ? Number(item.sellingPrice) : Number(item.product.sellingPrice),
        margin: Number(item.product.margin),
        stock: item.product.stock,
      },
    })),
  });
}
