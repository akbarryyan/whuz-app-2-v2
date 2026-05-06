import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";
import { slugifyBrand } from "@/lib/brand-utils";
import { upsertBrandByName } from "@/lib/brand-store";

export const dynamic = "force-dynamic";

interface ManualCategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface BrandMetaRow {
  id: string;
  brand: string;
  imageUrl: string | null;
  inputFields: Prisma.JsonValue | null;
  manualCategoryId: string | null;
}

async function findManualCategoryById(id: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const rows = await client.$queryRaw<ManualCategoryRow[]>`
    SELECT id, name, slug FROM manual_categories WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

async function findBrandMetaByBrand(brand: string, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const rows = await client.$queryRaw<BrandMetaRow[]>`
    SELECT id, brand, imageUrl, inputFields, manualCategoryId
    FROM brand_meta
    WHERE brand = ${brand}
    LIMIT 1
  `;
  return rows[0] ?? null;
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

    const baseSlug = slugifyBrand(fallbackName) || `kategori-${Date.now()}`;
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
    const [products, metas, brands] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { brand: true, category: true, provider: true },
        orderBy: { brand: "asc" },
      }),
      prisma.brandMeta.findMany({
        select: { brand: true, imageUrl: true, inputFields: true, updatedAt: true },
      }),
      prisma.$queryRaw<Array<{
        id: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        inputFields: Prisma.JsonValue | null;
        updatedAt: Date;
        manualCategoryName: string | null;
      }>>`
        SELECT b.id, b.name, b.slug, b.imageUrl, b.inputFields, b.updatedAt, mc.name AS manualCategoryName
        FROM brands b
        LEFT JOIN manual_categories mc ON mc.id = b.manualCategoryId
      `,
    ]);

    const metaMap: Record<string, { category?: string; imageUrl: string | null; inputFields: unknown; updatedAt: Date | null }> = {};
    for (const brand of brands) {
      metaMap[brand.name] = {
        category: brand.manualCategoryName ?? undefined,
        imageUrl: brand.imageUrl ?? null,
        inputFields: brand.inputFields ?? null,
        updatedAt: brand.updatedAt,
      };
    }
    for (const m of metas) {
      metaMap[m.brand] = {
        category: metaMap[m.brand]?.category,
        imageUrl: metaMap[m.brand]?.imageUrl ?? m.imageUrl ?? null,
        inputFields: metaMap[m.brand]?.inputFields ?? m.inputFields ?? null,
        updatedAt: metaMap[m.brand]?.updatedAt ?? m.updatedAt,
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
      slug: slugifyBrand(brandName),
      imageUrl: metaMap[brandName]?.imageUrl ?? null,
      inputFields: metaMap[brandName]?.inputFields ?? null,
      updatedAt: metaMap[brandName]?.updatedAt ?? null,
      manualProductCount: stats.manualProductCount,
      providerProductCount: stats.providerProductCount,
      canDelete: stats.providerProductCount === 0,
    }));

    for (const brand of brands) {
      if (data.some((item) => item.brand === brand.name)) continue;
      data.push({
        brand: brand.name,
        category: brand.manualCategoryName ?? "Manual",
        slug: brand.slug,
        imageUrl: brand.imageUrl ?? null,
        inputFields: brand.inputFields ?? null,
        updatedAt: brand.updatedAt,
        manualProductCount: 0,
        providerProductCount: 0,
        canDelete: true,
      });
    }

    for (const meta of metas) {
      if (data.some((item) => item.brand === meta.brand)) continue;
      data.push({
        brand: meta.brand,
        category: metaMap[meta.brand]?.category ?? "Manual",
        slug: slugifyBrand(meta.brand),
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
      await upsertBrandByName(
        brand,
        { imageUrl: imageUrl || null, manualCategoryId: manualCategory.id },
        tx
      );
      await tx.product.updateMany({
        where: { provider: "MANUAL", brand },
        data: { category: manualCategory.name },
      });
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
 * Update brand master data
 * Body: { brand: string, nextBrand?: string, imageUrl?: string, category?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, nextBrand, imageUrl, category } = body as {
      brand: string;
      nextBrand?: string;
      imageUrl?: string;
      category?: string;
    };

    if (!brand || typeof brand !== "string") {
      return NextResponse.json({ success: false, error: "brand diperlukan." }, { status: 400 });
    }

    const currentBrand = brand.trim();
    const targetBrand = String(nextBrand ?? brand).trim();
    if (!targetBrand) {
      return NextResponse.json({ success: false, error: "Nama brand baru wajib diisi." }, { status: 400 });
    }

    const meta = await prisma.$transaction(async (tx) => {
      const manualCategory = category !== undefined
        ? await ensureManualCategory(String(category).trim(), tx)
        : null;
      const currentMeta = await findBrandMetaByBrand(currentBrand, tx);
      const targetMeta = currentBrand === targetBrand
        ? currentMeta
        : await findBrandMetaByBrand(targetBrand, tx);

      const resolvedImageUrl = imageUrl !== undefined
        ? (imageUrl || null)
        : (targetMeta?.imageUrl ?? currentMeta?.imageUrl ?? null);
      const resolvedInputFields = targetMeta?.inputFields ?? currentMeta?.inputFields ?? undefined;
      const resolvedCategoryId = manualCategory?.id
        ?? targetMeta?.manualCategoryId
        ?? currentMeta?.manualCategoryId
        ?? null;
      const resolvedCategoryName = manualCategory?.name
        ?? (resolvedCategoryId ? (await findManualCategoryById(resolvedCategoryId, tx))?.name ?? null : null);

      if (currentBrand !== targetBrand) {
        const targetBrandRecord = await upsertBrandByName(
          targetBrand,
          {
            imageUrl: resolvedImageUrl,
            inputFields: resolvedInputFields ?? null,
            manualCategoryId: resolvedCategoryId,
          },
          tx
        );
        const hasExistingTargetProducts = await tx.product.count({
          where: { brand: targetBrand },
        });

        if (targetMeta || hasExistingTargetProducts > 0) {
          await tx.product.updateMany({
            where: { brand: currentBrand },
            data: {
              brand: targetBrand,
              ...(resolvedCategoryName ? { category: resolvedCategoryName } : {}),
            },
          });
          await tx.$executeRaw`
            UPDATE products SET brandId = ${targetBrandRecord.id} WHERE brand = ${targetBrand}
          `;

          const oldSlug = slugifyBrand(currentBrand);
          const newSlug = slugifyBrand(targetBrand);
          if (oldSlug !== newSlug) {
            await tx.$executeRaw`
              DELETE br_old
              FROM brand_reviews br_old
              INNER JOIN brand_reviews br_target
                ON br_target.userId = br_old.userId
               AND br_target.brandSlug = ${newSlug}
              WHERE br_old.brandSlug = ${oldSlug}
            `;
            await tx.brandReview.updateMany({
              where: { brandSlug: oldSlug },
              data: { brandSlug: newSlug },
            });
          }
          await tx.$executeRaw`
            UPDATE brand_reviews SET brandId = ${targetBrandRecord.id} WHERE brandSlug = ${newSlug}
          `;

          await tx.brandMeta.upsert({
            where: { brand: targetBrand },
            create: {
              brand: targetBrand,
              imageUrl: resolvedImageUrl,
              ...(resolvedInputFields !== undefined ? { inputFields: resolvedInputFields } : {}),
            },
            update: {
              imageUrl: resolvedImageUrl,
              ...(resolvedInputFields !== undefined ? { inputFields: resolvedInputFields } : {}),
            },
          });
          if (resolvedCategoryId !== null) {
            await tx.$executeRaw`
              UPDATE brand_meta SET manualCategoryId = ${resolvedCategoryId} WHERE brand = ${targetBrand}
            `;
          }

          if (currentMeta) {
            await tx.brandMeta.deleteMany({
              where: {
                brand: currentBrand,
                NOT: { brand: targetBrand },
              },
            });
          }
        } else {
          await tx.product.updateMany({
            where: { brand: currentBrand },
            data: {
              brand: targetBrand,
              ...(resolvedCategoryName ? { category: resolvedCategoryName } : {}),
            },
          });
          await tx.$executeRaw`
            UPDATE products SET brandId = ${targetBrandRecord.id} WHERE brand = ${targetBrand}
          `;

          const oldSlug = slugifyBrand(currentBrand);
          const newSlug = slugifyBrand(targetBrand);
          if (oldSlug !== newSlug) {
            await tx.brandReview.updateMany({
              where: { brandSlug: oldSlug },
              data: { brandSlug: newSlug },
            });
          }
          await tx.$executeRaw`
            UPDATE brand_reviews SET brandId = ${targetBrandRecord.id} WHERE brandSlug = ${newSlug}
          `;

          if (currentMeta) {
            await tx.brandMeta.update({
              where: { brand: currentBrand },
              data: {
                brand: targetBrand,
                imageUrl: resolvedImageUrl,
                ...(resolvedInputFields !== undefined ? { inputFields: resolvedInputFields } : {}),
              },
            });
            if (resolvedCategoryId !== null) {
              await tx.$executeRaw`
                UPDATE brand_meta SET manualCategoryId = ${resolvedCategoryId} WHERE brand = ${targetBrand}
              `;
            }
          } else {
            await tx.brandMeta.create({
              data: {
                brand: targetBrand,
                imageUrl: resolvedImageUrl,
                ...(resolvedInputFields !== undefined ? { inputFields: resolvedInputFields } : {}),
              },
            });
            if (resolvedCategoryId !== null) {
              await tx.$executeRaw`
                UPDATE brand_meta SET manualCategoryId = ${resolvedCategoryId} WHERE brand = ${targetBrand}
              `;
            }
          }
        }

        await tx.$executeRaw`
          DELETE FROM brands WHERE name = ${currentBrand} AND name <> ${targetBrand}
        `;
      } else {
        const currentBrandRecord = await upsertBrandByName(
          currentBrand,
          {
            imageUrl: resolvedImageUrl,
            inputFields: resolvedInputFields ?? null,
            manualCategoryId: resolvedCategoryId,
          },
          tx
        );
        await tx.brandMeta.upsert({
          where: { brand: currentBrand },
          create: {
            brand: currentBrand,
            imageUrl: resolvedImageUrl,
            ...(resolvedInputFields !== undefined ? { inputFields: resolvedInputFields } : {}),
          },
          update: {
            imageUrl: resolvedImageUrl,
            ...(resolvedInputFields !== undefined ? { inputFields: resolvedInputFields } : {}),
          },
        });
        if (resolvedCategoryId !== null) {
          await tx.$executeRaw`
            UPDATE brand_meta SET manualCategoryId = ${resolvedCategoryId} WHERE brand = ${currentBrand}
          `;
        }

        await tx.product.updateMany({
          where: { brand: currentBrand },
          data: {
            ...(manualCategory ? { category: manualCategory.name } : {}),
          },
        });
        await tx.$executeRaw`
          UPDATE products SET brandId = ${currentBrandRecord.id} WHERE brand = ${currentBrand}
        `;
      }

      return tx.brandMeta.findUnique({
        where: { brand: targetBrand },
      });
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

    await upsertBrandByName(brand, { inputFields: (inputFields ?? []) as Prisma.JsonValue });

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
        await tx.$executeRaw`
          DELETE FROM brands WHERE name = ${brand}
        `;
      });

      return NextResponse.json({ success: true });
    }

    await prisma.brandMeta.upsert({
      where: { brand },
      create: { brand, imageUrl: null },
      update: { imageUrl: null },
    });
    await upsertBrandByName(brand, { imageUrl: null });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN BRANDS DELETE ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus data." }, { status: 500 });
  }
}
