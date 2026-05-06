import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";
import { slugifyBrand } from "@/lib/brand-utils";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  inputFields: Prisma.JsonValue | null;
  manualCategoryId: string | null;
  isActive: boolean | number;
  createdAt: Date;
  updatedAt: Date;
  manualCategoryName?: string | null;
  manualCategorySlug?: string | null;
  manualCategoryActive?: boolean | number | null;
};

type UpsertBrandOptions = {
  imageUrl?: string | null;
  inputFields?: Prisma.JsonValue | null;
  manualCategoryId?: string | null;
  isActive?: boolean;
};

async function queryBrandByName(name: string, client: DbClient) {
  const rows = await client.$queryRaw<BrandRecord[]>`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.imageUrl,
      b.inputFields,
      b.manualCategoryId,
      b.isActive,
      b.createdAt,
      b.updatedAt,
      mc.name AS manualCategoryName,
      mc.slug AS manualCategorySlug,
      mc.isActive AS manualCategoryActive
    FROM brands b
    LEFT JOIN manual_categories mc ON mc.id = b.manualCategoryId
    WHERE b.name = ${name}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function queryBrandBySlug(slug: string, client: DbClient) {
  const rows = await client.$queryRaw<BrandRecord[]>`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.imageUrl,
      b.inputFields,
      b.manualCategoryId,
      b.isActive,
      b.createdAt,
      b.updatedAt,
      mc.name AS manualCategoryName,
      mc.slug AS manualCategorySlug,
      mc.isActive AS manualCategoryActive
    FROM brands b
    LEFT JOIN manual_categories mc ON mc.id = b.manualCategoryId
    WHERE b.slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function buildUniqueBrandSlug(
  name: string,
  client: DbClient,
  excludeId?: string
) {
  const baseSlug = slugifyBrand(name) || `brand-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM brands WHERE slug = ${slug} LIMIT 1
    `;
    const existing = rows[0];
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

export async function upsertBrandByName(
  name: string,
  options: UpsertBrandOptions = {},
  client: DbClient = prisma
) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Nama brand wajib diisi.");
  }

  const existing = await queryBrandByName(trimmedName, client);
  const slug = await buildUniqueBrandSlug(trimmedName, client, existing?.id);

  if (existing) {
    await client.$executeRaw`
      UPDATE brands
      SET
        slug = ${slug},
        imageUrl = ${options.imageUrl !== undefined ? options.imageUrl : existing.imageUrl},
        inputFields = ${options.inputFields !== undefined ? options.inputFields : existing.inputFields},
        manualCategoryId = ${options.manualCategoryId !== undefined ? options.manualCategoryId : existing.manualCategoryId},
        isActive = ${options.isActive !== undefined ? options.isActive : Boolean(existing.isActive)},
        updatedAt = NOW(3)
      WHERE id = ${existing.id}
    `;
    return (await queryBrandByName(trimmedName, client)) as BrandRecord;
  }

  const id = crypto.randomUUID();
  await client.$executeRaw`
    INSERT INTO brands (id, name, slug, imageUrl, inputFields, manualCategoryId, isActive, createdAt, updatedAt)
    VALUES (
      ${id},
      ${trimmedName},
      ${slug},
      ${options.imageUrl ?? null},
      ${options.inputFields ?? null},
      ${options.manualCategoryId ?? null},
      ${options.isActive ?? true},
      NOW(3),
      NOW(3)
    )
  `;

  return (await queryBrandByName(trimmedName, client)) as BrandRecord;
}

export async function findBrandByName(name: string, client: DbClient = prisma) {
  return queryBrandByName(name, client);
}

export async function findBrandBySlug(slug: string, client: DbClient = prisma) {
  return queryBrandBySlug(slug, client);
}
