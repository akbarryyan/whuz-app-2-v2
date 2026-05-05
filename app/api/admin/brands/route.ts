import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

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
  const fallbackName = name.trim() || "Top Up Game";
  const existing = await findManualCategoryByName(fallbackName, client);
  if (existing) return existing;

  const baseSlug = slugify(fallbackName) || `kategori-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (await findManualCategoryBySlug(slug, client)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const id = crypto.randomUUID();
  await client.$executeRaw`
    INSERT INTO manual_categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt)
    VALUES (${id}, ${fallbackName}, ${slug}, 99, true, NOW(3), NOW(3))
  `;

  return { id, name: fallbackName, slug };
}

/**
 * GET /api/admin/brands
 * List all distinct brands (from products) merged with their BrandMeta (imageUrl)
 */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { brand: true, category: true, provider: true },
      orderBy: { brand: "asc" },
    });

    const metas = await prisma.brandMeta.findMany({
      select: { brand: true, imageUrl: true, inputFields: true, updatedAt: true },
    });
    const categoryRows = await prisma.$queryRaw<Array<{ brand: string; category: string | null }>>`
      SELECT bm.brand, mc.name AS category
      FROM brand_meta bm
      LEFT JOIN manual_categories mc ON mc.id = bm.manualCategoryId
    `;
    const categoryMap: Record<string, string | null> = {};
    for (const row of categoryRows) categoryMap[row.brand] = row.category;

    const metaMap: Record<string, { category?: string; imageUrl: string | null; inputFields: unknown; updatedAt: Date }> = {};
    for (const m of metas) {
      metaMap[m.brand] = {
        category: categoryMap[m.brand] ?? undefined,
        imageUrl: m.imageUrl ?? null,
        inputFields: m.inputFields ?? null,
        updatedAt: m.updatedAt,
      };
    }

    const statsMap = new Map<string, { category: string; manualProductCount: number; providerProductCount: number }>();
    for (const product of products) {
      const current = statsMap.get(product.brand) ?? {
        category: product.category,
        manualProductCount: 0,
        providerProductCount: 0,
      };
      if (product.provider === "MANUAL") current.manualProductCount += 1;
      else current.providerProductCount += 1;
      statsMap.set(product.brand, current);
    }

    const data = Array.from(statsMap.entries()).map(([brandName, stats]) => ({
      brand: brandName,
      category: metaMap[brandName]?.category ?? stats.category,
      slug: brandName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      imageUrl: metaMap[brandName]?.imageUrl ?? null,
      inputFields: metaMap[brandName]?.inputFields ?? null,
      updatedAt: metaMap[brandName]?.updatedAt ?? null,
      manualProductCount: stats.manualProductCount,
      providerProductCount: stats.providerProductCount,
      canDelete: stats.providerProductCount === 0,
    }));

    for (const meta of metas) {
      if (data.some((item) => item.brand === meta.brand)) continue;
      data.push({
        brand: meta.brand,
        category: categoryMap[meta.brand] ?? "Manual",
        slug: meta.brand
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        imageUrl: meta.imageUrl ?? null,
        inputFields: meta.inputFields ?? null,
        updatedAt: meta.updatedAt,
        manualProductCount: 0,
        providerProductCount: 0,
        canDelete: true,
      });
    }

    data.sort((a, b) => a.brand.localeCompare(b.brand));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[ADMIN BRANDS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat brand." }, { status: 500 });
  }
}

/**
 * POST /api/admin/brands
 * Create a manual brand metadata row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const brand = String(body.brand ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    const category = String(body.category ?? "Top Up Game").trim() || "Top Up Game";

    if (!brand) {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    const meta = await prisma.$transaction(async (tx) => {
      const manualCategory = await ensureManualCategory(category, tx);
      const meta = await tx.brandMeta.upsert({
        where: { brand },
        create: { brand, imageUrl: imageUrl || null },
        update: {
          imageUrl: imageUrl || undefined,
        },
      });
      await tx.$executeRaw`
        UPDATE brand_meta SET manualCategoryId = ${manualCategory.id} WHERE brand = ${brand}
      `;
      return meta;
    });

    return NextResponse.json({ success: true, data: meta }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN BRANDS POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal membuat brand." }, { status: 500 });
  }
}

/**
 * PUT /api/admin/brands
 * Upsert imageUrl for a brand
 * Body: { brand: string, imageUrl?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, imageUrl, category } = body as { brand: string; imageUrl?: string; category?: string };

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    const meta = await prisma.$transaction(async (tx) => {
      const manualCategory = category !== undefined
        ? await ensureManualCategory(String(category).trim(), tx)
        : null;

      const meta = await tx.brandMeta.upsert({
        where: { brand },
        create: {
          brand,
          imageUrl: imageUrl || null,
        },
        update: {
          ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
        },
      });

      if (manualCategory) {
        await tx.$executeRaw`
          UPDATE brand_meta SET manualCategoryId = ${manualCategory.id} WHERE brand = ${brand}
        `;
      }

      return meta;
    });

    return NextResponse.json({ success: true, data: meta });
  } catch (error) {
    console.error("[ADMIN BRANDS PUT ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan data." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/brands
 * Upsert inputFields config for a brand
 * Body: { brand: string, inputFields: InputFieldDef[] }
 * InputFieldDef: { key: string, label: string, placeholder: string, required: boolean, width?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, inputFields } = body as { brand: string; inputFields: object[] | null };

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    const meta = await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand, inputFields: inputFields ?? [] },
      update: { inputFields: inputFields ?? [] },
    });

    return NextResponse.json({ success: true, data: meta });
  } catch (error) {
    console.error("[ADMIN BRANDS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan konfigurasi." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/brands/image
 * Clear imageUrl for a brand
 * Body: { brand: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, mode } = body as { brand: string; mode?: "image" | "brand" };

    if (!brand) {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    if (mode === "brand") {
      const linkedProducts = await prisma.product.findMany({
        where: { brand },
        select: { id: true, provider: true },
      });

      if (linkedProducts.some((product) => product.provider !== "MANUAL")) {
        return NextResponse.json(
          {
            success: false,
            error: "Brand provider tidak bisa dihapus. Brand ini masih terhubung ke produk sinkronisasi provider.",
          },
          { status: 409 }
        );
      }

      const productIds = linkedProducts.map((product) => product.id);

      if (productIds.length > 0) {
        const orderCount = await prisma.order.count({
          where: { productId: { in: productIds } },
        });

        if (orderCount > 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Brand tidak bisa dihapus karena sudah memiliki transaksi.",
            },
            { status: 409 }
          );
        }
      }

      await prisma.$transaction(async (tx) => {
        if (productIds.length > 0) {
          await tx.product.deleteMany({
            where: { id: { in: productIds } },
          });
        }

        await tx.brandMeta.deleteMany({
          where: { brand },
        });
      });

      return NextResponse.json({ success: true });
    }

    await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand, imageUrl: null },
      update: { imageUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN BRANDS DELETE ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus data." }, { status: 500 });
  }
}
