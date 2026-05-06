import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_MANUAL_CATEGORIES = [
  "Top Up Game",
  "Voucher Digital",
  "Pulsa & Data",
  "E-Wallet",
  "Token Listrik",
  "Jasa Manual",
];

interface ManualCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean | number;
  brandCount?: bigint | number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function findCategoryByName(name: string) {
  const rows = await prisma.$queryRaw<ManualCategoryRow[]>`
    SELECT id, name, slug, description, sortOrder, isActive
    FROM manual_categories
    WHERE name = ${name}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function findCategoryBySlug(slug: string) {
  const rows = await prisma.$queryRaw<ManualCategoryRow[]>`
    SELECT id, name, slug, description, sortOrder, isActive
    FROM manual_categories
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function ensureUniqueSlug(name: string, excludeId?: string) {
  const baseSlug = slugify(name) || `kategori-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await findCategoryBySlug(slug);
    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function ensureBaseManualCategories() {
  const productCategories = await prisma.product.findMany({
    where: { provider: "MANUAL" },
    distinct: ["category"],
    select: { category: true },
  });

  const names = Array.from(new Set([
    ...DEFAULT_MANUAL_CATEGORIES,
    ...productCategories.map((item) => item.category).filter(Boolean),
  ]));

  for (const [index, name] of names.entries()) {
    const existing = await findCategoryByName(name);
    if (existing) continue;

    await prisma.$executeRaw`
      INSERT INTO manual_categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt)
      VALUES (${crypto.randomUUID()}, ${name}, ${await ensureUniqueSlug(name)}, ${index}, true, NOW(3), NOW(3))
    `;
  }
}

function categoryToJson(category: ManualCategoryRow) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: Number(category.sortOrder),
    isActive: Boolean(category.isActive),
    brandCount: Number(category.brandCount ?? 0),
  };
}

export async function GET() {
  try {
    await ensureBaseManualCategories();

    const categories = await prisma.$queryRaw<ManualCategoryRow[]>`
      SELECT
        mc.id,
        mc.name,
        mc.slug,
        mc.description,
        mc.sortOrder,
        mc.isActive,
        COUNT(b.id) AS brandCount
      FROM manual_categories mc
      LEFT JOIN brands b ON b.manualCategoryId = mc.id
      GROUP BY mc.id, mc.name, mc.slug, mc.description, mc.sortOrder, mc.isActive
      ORDER BY mc.sortOrder ASC, mc.name ASC
    `;

    return NextResponse.json({
      success: true,
      data: categories.map(categoryToJson),
    });
  } catch (error) {
    console.error("[ADMIN MANUAL CATEGORIES GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat kategori manual." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama kategori wajib diisi." }, { status: 400 });
    }

    const existing = await findCategoryByName(name);
    if (existing) {
      return NextResponse.json({ success: false, error: "Nama kategori sudah dipakai." }, { status: 409 });
    }

    const category = {
      id: crypto.randomUUID(),
      name,
      slug: await ensureUniqueSlug(name),
      description: description || null,
      sortOrder,
      isActive,
      brandCount: 0,
    };

    await prisma.$executeRaw`
      INSERT INTO manual_categories (id, name, slug, description, sortOrder, isActive, createdAt, updatedAt)
      VALUES (${category.id}, ${category.name}, ${category.slug}, ${category.description}, ${category.sortOrder}, ${category.isActive}, NOW(3), NOW(3))
    `;

    return NextResponse.json({ success: true, data: categoryToJson(category) }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN MANUAL CATEGORIES POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal membuat kategori. Pastikan nama belum dipakai." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ success: false, error: "ID kategori wajib diisi." }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<ManualCategoryRow[]>`
      SELECT id, name, slug, description, sortOrder, isActive
      FROM manual_categories
      WHERE id = ${id}
      LIMIT 1
    `;
    const current = rows[0];
    if (!current) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    const nextName = body.name !== undefined ? String(body.name).trim() : current.name;
    const nextDescription = body.description !== undefined ? String(body.description ?? "").trim() || null : current.description;
    const nextSortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : Number(current.sortOrder);
    const nextIsActive = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(current.isActive);
    const nextSlug = nextName !== current.name ? await ensureUniqueSlug(nextName, id) : current.slug;

    if (!nextName) {
      return NextResponse.json({ success: false, error: "Nama kategori wajib diisi." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE manual_categories
        SET name = ${nextName},
            slug = ${nextSlug},
            description = ${nextDescription},
            sortOrder = ${nextSortOrder},
            isActive = ${nextIsActive},
            updatedAt = NOW(3)
        WHERE id = ${id}
      `;

      if (nextName !== current.name) {
        await tx.product.updateMany({
          where: { provider: "MANUAL", category: current.name },
          data: { category: nextName },
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: categoryToJson({
        id,
        name: nextName,
        slug: nextSlug,
        description: nextDescription,
        sortOrder: nextSortOrder,
        isActive: nextIsActive,
      }),
    });
  } catch (error) {
    console.error("[ADMIN MANUAL CATEGORIES PUT ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan kategori." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ success: false, error: "ID kategori wajib diisi." }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<ManualCategoryRow[]>`
      SELECT id, name, slug, description, sortOrder, isActive
      FROM manual_categories
      WHERE id = ${id}
      LIMIT 1
    `;
    const category = rows[0];
    if (!category) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    const usedProducts = await prisma.product.count({
      where: { provider: "MANUAL", category: category.name },
    });
    const usedBrandRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM brands WHERE manualCategoryId = ${id}
    `;
    const usedBrands = Number(usedBrandRows[0]?.total ?? 0);

    if (usedProducts > 0 || usedBrands > 0) {
      await prisma.$executeRaw`
        UPDATE manual_categories SET isActive = false, updatedAt = NOW(3) WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, softDeleted: true });
    }

    await prisma.$executeRaw`DELETE FROM manual_categories WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN MANUAL CATEGORIES DELETE ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus kategori." }, { status: 500 });
  }
}
