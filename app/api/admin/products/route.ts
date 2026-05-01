import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

function productToJson(product: Awaited<ReturnType<typeof prisma.product.findFirst>> & {}) {
  return {
    id: product.id,
    provider: product.provider,
    providerCode: product.providerCode,
    name: product.name,
    category: product.category,
    brand: product.brand,
    type: product.type,
    providerPrice: Number(product.providerPrice),
    margin: Number(product.margin),
    sellingPrice: Number(product.sellingPrice),
    stock: product.stock,
    description: product.description,
    isActive: product.isActive,
    lastSyncAt: product.lastSyncAt.toISOString(),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

/**
 * GET /api/admin/products
 * Get all products with full details
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: [
        { isActive: "desc" },
        { category: "asc" },
        { sellingPrice: "asc" },
      ],
    });

    // Convert Decimal to number
    const productsData = products.map(productToJson);

    return NextResponse.json({
      success: true,
      data: productsData,
      meta: {
        total: productsData.length,
        active: productsData.filter((p) => p.isActive).length,
        inactive: productsData.filter((p) => !p.isActive).length,
      },
    });
  } catch (error) {
    console.error("Failed to get products:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * Create a manual product.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const brand = String(body.brand ?? "").trim();
    const type = String(body.type ?? "manual").trim() || "manual";
    const providerCode = String(body.providerCode ?? `MANUAL-${Date.now()}`).trim();
    const providerPrice = Math.max(0, Number(body.providerPrice ?? 0));
    const margin = Math.max(0, Number(body.margin ?? 0));
    const sellingPrice = body.sellingPrice !== undefined
      ? Math.max(0, Number(body.sellingPrice))
      : providerPrice + margin;

    if (!name || !category || !brand || !providerCode) {
      return NextResponse.json(
        { success: false, error: "Nama, kategori, brand, dan kode produk wajib diisi." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        provider: "MANUAL",
        providerCode,
        name,
        category,
        brand,
        type,
        providerPrice,
        margin: sellingPrice - providerPrice,
        sellingPrice,
        stock: body.stock !== undefined ? Boolean(body.stock) : true,
        description: String(body.description ?? "").trim() || null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand },
      update: {},
    });

    return NextResponse.json({ success: true, data: productToJson(product) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create manual product:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat produk manual. Pastikan kode produk belum dipakai." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/products
 * Update product (margin, isActive)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, margin, isActive } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    // Get current product to calculate new selling price
    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Prisma.ProductUpdateInput = {};

    if (margin !== undefined) {
      updateData.margin = margin;
      updateData.sellingPrice = Number(currentProduct.providerPrice) + margin;
    }

    if (currentProduct.provider === "MANUAL") {
      const providerPrice = body.providerPrice !== undefined ? Math.max(0, Number(body.providerPrice)) : Number(currentProduct.providerPrice);
      const sellingPrice = body.sellingPrice !== undefined ? Math.max(0, Number(body.sellingPrice)) : providerPrice + Number(updateData.margin ?? currentProduct.margin);

      if (body.providerCode !== undefined) updateData.providerCode = String(body.providerCode).trim();
      if (body.name !== undefined) updateData.name = String(body.name).trim();
      if (body.category !== undefined) updateData.category = String(body.category).trim();
      if (body.brand !== undefined) updateData.brand = String(body.brand).trim();
      if (body.type !== undefined) updateData.type = String(body.type).trim() || "manual";
      if (body.providerPrice !== undefined) updateData.providerPrice = providerPrice;
      if (body.sellingPrice !== undefined || body.providerPrice !== undefined) {
        updateData.sellingPrice = sellingPrice;
        updateData.margin = sellingPrice - providerPrice;
      }
      if (body.stock !== undefined) updateData.stock = Boolean(body.stock);
      if (body.description !== undefined) updateData.description = String(body.description).trim() || null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Convert Decimal to number
    const productData = productToJson(updatedProduct);

    return NextResponse.json({
      success: true,
      data: productData,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update product",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { provider: true, _count: { select: { orders: true, sellerProducts: true } } },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }
    if (product.provider !== "MANUAL") {
      return NextResponse.json({ success: false, error: "Hanya produk manual yang bisa dihapus." }, { status: 400 });
    }
    if (product._count.orders > 0 || product._count.sellerProducts > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false, stock: false } });
      return NextResponse.json({ success: true, softDeleted: true });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 });
  }
}
