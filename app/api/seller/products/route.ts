import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/infra/db/prisma";
import { requireSellerSession } from "@/lib/seller";

export const dynamic = "force-dynamic";

const SellerProductSchema = z.object({
  productId: z.string().min(1),
  sellingPrice: z.number().positive().optional(),
  commissionType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  commissionValue: z.number().min(0).max(1000000).default(0),
  feeType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  feeValue: z.number().min(0).max(1000000).default(0),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const seller = await requireSellerSession();
  if ("error" in seller) {
    return NextResponse.json({ success: false, error: seller.error }, { status: seller.status });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const selectedOnly = searchParams.get("selectedOnly") === "true";

  const [selectedProducts, catalogProducts] = await Promise.all([
    prisma.sellerProduct.findMany({
      where: { sellerId: seller.session.userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        stock: true,
        ...(selectedOnly
          ? {
              sellerProducts: {
                some: { sellerId: seller.session.userId },
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { brand: { contains: q } },
                { category: { contains: q } },
                { providerCode: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
    }),
  ]);

  const selectedMap = new Map(selectedProducts.map((item) => [item.productId, item]));

  return NextResponse.json({
    success: true,
    data: catalogProducts.map((product) => {
      const selected = selectedMap.get(product.id);
      return {
        id: product.id,
        provider: product.provider,
        providerCode: product.providerCode,
        name: product.name,
        brand: product.brand,
        category: product.category,
        type: product.type,
        providerPrice: Number(product.providerPrice),
        sellingPrice: Number(product.sellingPrice),
        margin: Number(product.margin),
        stock: product.stock,
        isSelected: Boolean(selected),
        sellerProduct: selected
          ? {
              id: selected.id,
              sellingPrice: selected.sellingPrice !== null ? Number(selected.sellingPrice) : null,
              commissionType: selected.commissionType,
              commissionValue: Number(selected.commissionValue),
              feeType: selected.feeType,
              feeValue: Number(selected.feeValue),
              isActive: selected.isActive,
            }
          : null,
      };
    }),
    selected: selectedProducts.map((item) => ({
      id: item.id,
      productId: item.productId,
      sellingPrice: item.sellingPrice !== null ? Number(item.sellingPrice) : null,
      commissionType: item.commissionType,
      commissionValue: Number(item.commissionValue),
      feeType: item.feeType,
      feeValue: Number(item.feeValue),
      isActive: item.isActive,
      product: {
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        category: item.product.category,
        provider: item.product.provider,
        providerPrice: Number(item.product.providerPrice),
        defaultMargin: Number(item.product.margin),
        sellingPrice: Number(item.product.sellingPrice),
      },
    })),
  });
}

export async function POST(req: NextRequest) {
  const seller = await requireSellerSession();
  if ("error" in seller) {
    return NextResponse.json({ success: false, error: seller.error }, { status: seller.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak valid" }, { status: 400 });
  }

  const parsed = SellerProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, isActive: true, stock: true },
  });

  if (!product || !product.isActive || !product.stock) {
    return NextResponse.json({ success: false, error: "Produk tidak tersedia untuk seller" }, { status: 404 });
  }

  const sellerProduct = await prisma.sellerProduct.upsert({
    where: {
      sellerId_productId: {
        sellerId: seller.session.userId!,
        productId: parsed.data.productId,
      },
    },
    create: {
      sellerId: seller.session.userId!,
      productId: parsed.data.productId,
      sellingPrice: parsed.data.sellingPrice,
      commissionType: parsed.data.commissionType,
      commissionValue: parsed.data.commissionValue,
      feeType: parsed.data.feeType,
      feeValue: parsed.data.feeValue,
      isActive: parsed.data.isActive ?? true,
    },
    update: {
      sellingPrice: parsed.data.sellingPrice,
      commissionType: parsed.data.commissionType,
      commissionValue: parsed.data.commissionValue,
      feeType: parsed.data.feeType,
      feeValue: parsed.data.feeValue,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ success: true, data: sellerProduct });
}

export async function DELETE(req: NextRequest) {
  const seller = await requireSellerSession();
  if ("error" in seller) {
    return NextResponse.json({ success: false, error: seller.error }, { status: seller.status });
  }

  let body: { productId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Ignore and continue to validation
  }

  if (!body.productId) {
    return NextResponse.json({ success: false, error: "productId wajib diisi" }, { status: 400 });
  }

  await prisma.sellerProduct.deleteMany({
    where: {
      sellerId: seller.session.userId,
      productId: body.productId,
    },
  });

  return NextResponse.json({ success: true });
}
