import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

const PricingSchema = z.object({
  productId: z.string().min(1),
  sellingPrice: z.number().positive(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const merchant = await requireSellerSession();
  if ("error" in merchant) {
    return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.sellerProduct.findMany({
    where: {
      sellerId: merchant.session.userId!,
      ...(q
        ? {
            product: {
              OR: [
                { name: { contains: q } },
                { brand: { contains: q } },
                { category: { contains: q } },
                { providerCode: { contains: q } },
              ],
            },
          }
        : {}),
    },
    include: { product: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json({
    success: true,
    data: rows.map((row) => {
      const providerPrice = Number(row.product.providerPrice);
      const websiteSellingPrice = Number(row.product.sellingPrice);
      const merchantSellingPrice = row.sellingPrice !== null ? Number(row.sellingPrice) : Number(row.product.sellingPrice);
      const margin = Math.max(0, merchantSellingPrice - websiteSellingPrice);

      return {
        id: row.id,
        productId: row.productId,
        isActive: row.isActive,
        feeType: row.feeType,
        feeValue: Number(row.feeValue),
        sellingPrice: merchantSellingPrice,
        margin,
        product: {
          id: row.product.id,
          name: row.product.name,
          brand: row.product.brand,
          category: row.product.category,
          provider: row.product.provider,
          providerCode: row.product.providerCode,
          defaultSellingPrice: websiteSellingPrice,
          defaultMargin: Number(row.product.margin),
        },
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const merchant = await requireSellerSession();
  if ("error" in merchant) {
    return NextResponse.json({ success: false, error: merchant.error }, { status: merchant.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
  }

  const parsed = PricingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, providerPrice: true, sellingPrice: true, isActive: true, stock: true },
  });

  if (!product || !product.isActive || !product.stock) {
    return NextResponse.json({ success: false, error: "Produk tidak tersedia" }, { status: 404 });
  }

  const websiteSellingPrice = Number(product.sellingPrice);
  if (parsed.data.sellingPrice < websiteSellingPrice) {
    return NextResponse.json({ success: false, error: "Harga jual merchant tidak boleh di bawah harga website" }, { status: 422 });
  }

  const [sellerProfile] = await prisma.$queryRaw<
    Array<{ platformFeeType: string | null; platformFeeValue: number | string | null }>
  >`
    SELECT platformFeeType, platformFeeValue
    FROM seller_profiles
    WHERE userId = ${merchant.session.userId!}
    LIMIT 1
  `;

  const merchantMargin = Math.max(0, parsed.data.sellingPrice - websiteSellingPrice);
  const existing = await prisma.sellerProduct.findUnique({
    where: {
      sellerId_productId: {
        sellerId: merchant.session.userId!,
        productId: parsed.data.productId,
      },
    },
    select: {
      feeType: true,
      feeValue: true,
    },
  });

  const row = await prisma.sellerProduct.upsert({
    where: {
      sellerId_productId: {
        sellerId: merchant.session.userId!,
        productId: parsed.data.productId,
      },
    },
    create: {
      sellerId: merchant.session.userId!,
      productId: parsed.data.productId,
      sellingPrice: parsed.data.sellingPrice,
      commissionType: "FIXED",
      commissionValue: merchantMargin,
      feeType: sellerProfile?.platformFeeType === "PERCENT" ? "PERCENT" : existing?.feeType ?? "FIXED",
      feeValue: sellerProfile?.platformFeeValue !== undefined ? Number(sellerProfile.platformFeeValue) : existing?.feeValue ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
    update: {
      sellingPrice: parsed.data.sellingPrice,
      commissionType: "FIXED",
      commissionValue: merchantMargin,
      feeType: sellerProfile?.platformFeeType === "PERCENT" ? "PERCENT" : existing?.feeType ?? "FIXED",
      feeValue: sellerProfile?.platformFeeValue !== undefined ? Number(sellerProfile.platformFeeValue) : existing?.feeValue ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
    include: { product: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      sellingPrice: row.sellingPrice !== null ? Number(row.sellingPrice) : null,
      margin: Number(row.commissionValue),
      feeType: row.feeType,
      feeValue: Number(row.feeValue),
      isActive: row.isActive,
    },
  });
}
