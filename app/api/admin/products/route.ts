import { NextResponse } from "next/server";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";
import { findBrandByName, upsertBrandByName } from "@/lib/brand-store";

export const dynamic = "force-dynamic";

function productToJson(
  product: Awaited<ReturnType<typeof prisma.product.findFirst>> & {},
  digitalStock?: { available: number; sold: number; disabled: number }
) {
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
    digitalStock: digitalStock ?? { available: 0, sold: 0, disabled: 0 },
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface ManualCategoryRow {
  id: string;
  name: string;
  slug: string;
}

async function findBrandCategoryName(brand: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const brandRecord = await findBrandByName(brand, client);
  if (brandRecord?.manualCategoryName) {
    return brandRecord.manualCategoryName;
  }

  const rows = await client.$queryRaw<Array<{ category: string | null }>>`
    SELECT mc.name AS category
    FROM brand_meta bm
    LEFT JOIN manual_categories mc ON mc.id = bm.manualCategoryId
    WHERE bm.brand = ${brand}
    LIMIT 1
  `;
  return rows[0]?.category ?? null;
}

async function findManualCategoryByName(name: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const rows = await client.$queryRaw<ManualCategoryRow[]>`
    SELECT id, name, slug FROM manual_categories WHERE name = ${name} LIMIT 1
  `;
  return rows[0] ?? null;
}

async function findManualCategoryBySlug(slug: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const rows = await client.$queryRaw<ManualCategoryRow[]>`
    SELECT id, name, slug FROM manual_categories WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

async function ensureManualCategory(name: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const existing = await findManualCategoryByName(name, client);
  if (existing) return existing;

  const baseSlug = slugify(name) || `kategori-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (await findManualCategoryBySlug(slug, client)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const id = crypto.randomUUID();
  await client.$executeRaw`
    INSERT INTO manual_categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt)
    VALUES (${id}, ${name}, ${slug}, 99, true, NOW(3), NOW(3))
  `;

  return { id, name, slug };
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

    const stockRows = await prisma.$queryRaw<Array<{
      productId: string;
      status: string;
      total: bigint;
    }>>`
      SELECT productId, status, COUNT(*) AS total
      FROM digital_product_stocks
      GROUP BY productId, status
    `;
    const stockMap = new Map<string, { available: number; sold: number; disabled: number }>();
    for (const row of stockRows) {
      const current = stockMap.get(row.productId) ?? { available: 0, sold: 0, disabled: 0 };
      if (row.status === "AVAILABLE") current.available = Number(row.total);
      if (row.status === "SOLD") current.sold = Number(row.total);
      if (row.status === "DISABLED") current.disabled = Number(row.total);
      stockMap.set(row.productId, current);
    }

    // Convert Decimal to number
    const productsData = products.map((product) => productToJson(product, stockMap.get(product.id)));

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
    const brand = String(body.brand ?? "").trim();
    const type = String(body.type ?? "manual").trim() || "manual";
    const providerCode = String(body.providerCode ?? `MANUAL-${Date.now()}`).trim();
    const providerPrice = Math.max(0, Number(body.providerPrice ?? 0));
    const margin = Math.max(0, Number(body.margin ?? 0));
    const sellingPrice = body.sellingPrice !== undefined
      ? Math.max(0, Number(body.sellingPrice))
      : providerPrice + margin;

    if (!name || !brand || !providerCode) {
      return NextResponse.json(
        { success: false, error: "Nama, brand, dan kode produk wajib diisi." },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const category = await findBrandCategoryName(brand, tx);
      if (!category) {
        throw new Error("Brand belum memiliki kategori. Atur kategori brand terlebih dahulu di halaman Brand.");
      }

      const manualCategory = await ensureManualCategory(category, tx);
      const brandRecord = await upsertBrandByName(
        brand,
        { manualCategoryId: manualCategory.id },
        tx
      );

      const createdProduct = await tx.product.create({
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

      await tx.brandMeta.upsert({
        where: { brand },
        create: { brand },
        update: {},
      });

      await tx.$executeRaw`
        UPDATE brand_meta SET manualCategoryId = ${manualCategory.id} WHERE brand = ${brand}
      `;
      await tx.$executeRaw`
        UPDATE products SET brandId = ${brandRecord.id} WHERE id = ${createdProduct.id}
      `;

      return createdProduct;
    });

    return NextResponse.json({ success: true, data: productToJson(product) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create manual product:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal membuat produk manual. Pastikan kode produk belum dipakai." },
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
      const nextBrand = body.brand !== undefined ? String(body.brand).trim() : currentProduct.brand;

      if (body.providerCode !== undefined) updateData.providerCode = String(body.providerCode).trim();
      if (body.name !== undefined) updateData.name = String(body.name).trim();
      if (body.brand !== undefined) updateData.brand = nextBrand;
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

    const updatedProduct = await prisma.$transaction(async (tx) => {
      if (currentProduct.provider === "MANUAL") {
        const effectiveBrand = String(updateData.brand ?? currentProduct.brand);
        const category = await findBrandCategoryName(effectiveBrand, tx);
        if (!category) {
          throw new Error("Brand belum memiliki kategori. Atur kategori brand terlebih dahulu di halaman Brand.");
        }
        const manualCategory = await ensureManualCategory(category, tx);
        const brandRecord = await upsertBrandByName(
          effectiveBrand,
          { manualCategoryId: manualCategory.id },
          tx
        );
        updateData.category = category;
        await tx.$executeRaw`
          UPDATE products SET brandId = ${brandRecord.id} WHERE id = ${id}
        `;
      }

      const product = await tx.product.update({
        where: { id },
        data: updateData,
      });

      if (product.provider === "MANUAL") {
        const manualCategory = await ensureManualCategory(product.category, tx);
        const brandRecord = await upsertBrandByName(
          product.brand,
          { manualCategoryId: manualCategory.id },
          tx
        );
        await tx.brandMeta.upsert({
          where: { brand: product.brand },
          create: { brand: product.brand },
          update: {},
        });

        await tx.$executeRaw`
          UPDATE brand_meta SET manualCategoryId = ${manualCategory.id} WHERE brand = ${product.brand}
        `;
        await tx.$executeRaw`
          UPDATE products SET brandId = ${brandRecord.id} WHERE id = ${product.id}
        `;
      }

      return product;
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
        error: error instanceof Error ? error.message : "Failed to update product",
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
