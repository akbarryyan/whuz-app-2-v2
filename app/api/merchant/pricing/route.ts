import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

const PricingSchema = z.object({
  productId: z.string().min(1),
  sellingPrice: z.number().positive(),
  feeType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  feeValue: z.number().min(0).max(1000000).default(0),
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
      const merchantSellingPrice = row.sellingPrice !== null ? Number(row.sellingPrice) : Number(row.product.sellingPrice);
      const margin = Math.max(0, merchantSellingPrice - providerPrice);

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
          providerPrice,
          defaultSellingPrice: Number(row.product.sellingPrice),
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
    select: { id: true, providerPrice: true, isActive: true, stock: true },
  });

  if (!product || !product.isActive || !product.stock) {
    return NextResponse.json({ success: false, error: "Produk tidak tersedia" }, { status: 404 });
  }

  const providerPrice = Number(product.providerPrice);
  if (parsed.data.sellingPrice < providerPrice) {
    return NextResponse.json({ success: false, error: "Harga jual tidak boleh di bawah harga provider" }, { status: 422 });
  }

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
      commissionValue: parsed.data.sellingPrice - providerPrice,
      feeType: parsed.data.feeType,
      feeValue: parsed.data.feeValue,
      isActive: parsed.data.isActive ?? true,
    },
    update: {
      sellingPrice: parsed.data.sellingPrice,
      commissionType: "FIXED",
      commissionValue: parsed.data.sellingPrice - providerPrice,
      feeType: parsed.data.feeType,
      feeValue: parsed.data.feeValue,
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
