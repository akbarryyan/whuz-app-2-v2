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
    // All distinct brand names from active products
    const productBrands = await prisma.product.findMany({
      where: { isActive: true },
      select: { brand: true, category: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    });

    // Fetch all BrandMeta
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

    const data = productBrands.map((b) => ({
      brand: b.brand,
      category: metaMap[b.brand]?.category ?? b.category,
      slug: b.brand
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
      imageUrl: metaMap[b.brand]?.imageUrl ?? null,
      inputFields: metaMap[b.brand]?.inputFields ?? null,
      updatedAt: metaMap[b.brand]?.updatedAt ?? null,
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
      });
    }

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
    const { brand } = body as { brand: string };

    if (!brand) {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
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
