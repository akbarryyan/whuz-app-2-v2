import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type RawRow = Record<string, unknown>;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeEmail(value: unknown): string | null {
  const raw = normalizeString(value).toLowerCase();
  return raw && raw.includes("@") ? raw : null;
}

function normalizePhone(value: unknown): string | null {
  const raw = normalizeString(value).replace(/\s+/g, "");
  return raw || null;
}

function normalizeActive(value: unknown): boolean {
  const raw = normalizeString(value).toLowerCase();
  if (!raw) return true;
  return ["1", "true", "yes", "aktif", "active"].includes(raw);
}

function normalizeImportRole(value: unknown): "MEMBER" | "MERCHANT" {
  const raw = normalizeString(value).toLowerCase();
  if (!raw) return "MEMBER";
  if (["merchant", "seller", "mitra", "toko"].includes(raw)) return "MERCHANT";
  return "MEMBER";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pickValue(row: RawRow, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return null;
}

async function ensureAdmin() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

async function generateUniqueMerchantSlug(
  preferredSlug: string,
  takenSlugs: Set<string>
): Promise<string> {
  const baseSlug = slugify(preferredSlug) || `merchant-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 2;

  while (takenSlugs.has(candidate)) {
    candidate = `${baseSlug}-${counter}`.slice(0, 80);
    counter++;
  }

  takenSlugs.add(candidate);
  return candidate;
}

export async function POST(request: Request) {
  try {
    const session = await ensureAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "File Excel wajib diunggah." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json({ success: false, error: "Sheet Excel tidak ditemukan." }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "File Excel kosong atau tidak memiliki baris data." }, { status: 400 });
    }

    const tiers = await prisma.userTier.findMany({
      select: { id: true, name: true, label: true },
    });

    const tierMap = new Map<string, string>();
    for (const tier of tiers) {
      tierMap.set(tier.id.toLowerCase(), tier.id);
      tierMap.set(tier.name.toLowerCase(), tier.id);
      tierMap.set(tier.label.toLowerCase(), tier.id);
    }

    const existingUsers = await prisma.user.findMany({
      select: { email: true, phone: true },
    });
    const existingSellerProfiles = await prisma.sellerProfile.findMany({
      select: { slug: true },
    });
    const existingEmails = new Set(existingUsers.map((user) => user.email?.toLowerCase()).filter(Boolean) as string[]);
    const existingPhones = new Set(existingUsers.map((user) => user.phone).filter(Boolean) as string[]);
    const existingSlugs = new Set(existingSellerProfiles.map((seller) => seller.slug.toLowerCase()));

    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const results: string[] = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // header row is row 1

      const name = normalizeString(pickValue(row, ["name", "nama"]));
      const email = normalizeEmail(pickValue(row, ["email", "e-mail"]));
      const phone = normalizePhone(pickValue(row, ["phone", "nomor_hp", "no_hp", "whatsapp"]));
      const password = normalizeString(pickValue(row, ["password", "kata_sandi"]));
      const tierRaw = normalizeString(pickValue(row, ["tier", "tier_name", "tier_label"]));
      const isActive = normalizeActive(pickValue(row, ["is_active", "active", "status"]));
      const importRole = normalizeImportRole(pickValue(row, ["role", "type", "account_type", "jenis_akun"]));
      const merchantName = normalizeString(
        pickValue(row, ["merchant_name", "display_name", "store_name", "nama_toko"])
      );
      const merchantSlugRaw = normalizeString(
        pickValue(row, ["merchant_slug", "slug", "store_slug"])
      );
      const merchantDescription = normalizeString(
        pickValue(row, ["merchant_description", "description", "deskripsi_toko"])
      );
      const merchantActive = normalizeActive(
        pickValue(row, ["merchant_is_active", "merchant_active", "status_merchant"])
      );

      if (!email && !phone) {
        skippedCount++;
        results.push(`Baris ${rowNumber}: dilewati karena email/nomor HP kosong.`);
        continue;
      }

      if (!password || password.length < 6) {
        skippedCount++;
        results.push(`Baris ${rowNumber}: dilewati karena password minimal 6 karakter wajib diisi.`);
        continue;
      }

      if (email && (existingEmails.has(email) || seenEmails.has(email))) {
        skippedCount++;
        results.push(`Baris ${rowNumber}: dilewati karena email ${email} sudah terdaftar.`);
        continue;
      }

      if (phone && (existingPhones.has(phone) || seenPhones.has(phone))) {
        skippedCount++;
        results.push(`Baris ${rowNumber}: dilewati karena nomor ${phone} sudah terdaftar.`);
        continue;
      }

      let tierId: string | null = null;
      if (tierRaw) {
        tierId = tierMap.get(tierRaw.toLowerCase()) ?? null;
        if (!tierId) {
          skippedCount++;
          results.push(`Baris ${rowNumber}: dilewati karena tier "${tierRaw}" tidak ditemukan.`);
          continue;
        }
      }

      let sellerProfileData:
        | {
            slug: string;
            displayName: string;
            description: string | null;
            isActive: boolean;
          }
        | null = null;

      if (importRole === "MERCHANT") {
        const displayName = merchantName || name || email || phone;
        if (!displayName) {
          skippedCount++;
          results.push(`Baris ${rowNumber}: dilewati karena merchant membutuhkan nama toko/display name.`);
          continue;
        }

        const uniqueSlug = await generateUniqueMerchantSlug(
          merchantSlugRaw || displayName,
          existingSlugs
        );

        sellerProfileData = {
          slug: uniqueSlug,
          displayName,
          description: merchantDescription || null,
          isActive: merchantActive,
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          name: name || null,
          email,
          phone,
          passwordHash,
          role: "MEMBER",
          tierId,
          isActive,
          wallet: {
            create: {
              balance: 0,
            },
          },
          ...(sellerProfileData
            ? {
                sellerProfile: {
                  create: sellerProfileData,
                },
              }
            : {}),
        },
      });

      if (email) {
        existingEmails.add(email);
        seenEmails.add(email);
      }
      if (phone) {
        existingPhones.add(phone);
        seenPhones.add(phone);
      }

      createdCount++;
      const createdLabel = (email ?? phone ?? name) || "baru";
      results.push(
        `Baris ${rowNumber}: ${importRole === "MERCHANT" ? "merchant" : "member"} ${createdLabel} berhasil dibuat.`
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rows.length,
        createdCount,
        skippedCount,
        results,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/users/import]", error);
    return NextResponse.json({ success: false, error: "Gagal memproses import Excel member/merchant." }, { status: 500 });
  }
}
