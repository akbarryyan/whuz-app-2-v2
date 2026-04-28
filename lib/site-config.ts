/**
 * lib/site-config.ts
 *
 * DB-backed site configuration with in-memory cache.
 * Admin can toggle provider modes at runtime — changes persist across restarts.
 *
 * Keys:
 *   PROVIDER_DIGIFLAZZ_MODE  — "mock" | "real"
 *   PROVIDER_VIP_MODE        — "mock" | "real"
 *   PROVIDER_PAKASIR_MODE    — "sandbox" | "production"  (keduanya call API, beda env)
 */

import { prisma } from "@/src/infra/db/prisma";
import {
  DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG,
  PaymentGatewayFeeConfig,
  normalizePaymentGatewayFeeConfig,
  normalizePaymentGatewayFeeType,
} from "@/lib/payment-gateway-fee";

export const DEFAULT_SITE_NAME = "Website";

// ── In-memory cache to avoid DB hit on every request ─────────────────────────
const g = globalThis as unknown as {
  _siteConfigCache?: Record<string, string>;
  _siteConfigCacheAt?: number;
};

const CACHE_TTL_MS = 10_000; // 10 seconds

function isCacheValid(): boolean {
  if (!g._siteConfigCache || !g._siteConfigCacheAt) return false;
  return Date.now() - g._siteConfigCacheAt < CACHE_TTL_MS;
}

/** Force invalidate cache — call after any write */
export function invalidateSiteConfigCache(): void {
  g._siteConfigCache = undefined;
  g._siteConfigCacheAt = undefined;
}

/** Returns all site configs as key→value record (cached) */
export async function getAllSiteConfig(): Promise<Record<string, string>> {
  if (isCacheValid()) return { ...g._siteConfigCache! };

  try {
    const rows = await prisma.siteConfig.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    g._siteConfigCache = map;
    g._siteConfigCacheAt = Date.now();
    return { ...map };
  } catch {
    // DB not available — return empty (fall through to env defaults)
    return {};
  }
}

/** Get one config value (cached) */
export async function getSiteConfig(key: string): Promise<string | null> {
  const all = await getAllSiteConfig();
  return all[key] ?? null;
}

/** Get one config value with env fallback. Priority: DB -> env -> fallback */
export async function getSiteConfigValue(key: string, fallback = ""): Promise<string> {
  const dbValue = await getSiteConfig(key);
  if (dbValue !== null) return dbValue;

  const envKey = ENV_KEY_MAP[key] ?? key;
  return process.env[envKey] ?? fallback;
}

export async function getSiteName(): Promise<string> {
  return (
    (await getSiteConfig("site_name")) ||
    (await getSiteConfig("SITE_NAME")) ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.APP_NAME ||
    DEFAULT_SITE_NAME
  );
}

export async function getPaymentGatewayFeeConfig(
  methodKey = "qris"
): Promise<PaymentGatewayFeeConfig> {
  const normalizedMethod = String(methodKey).trim().toUpperCase() || "QRIS";
  const [typeRaw, valueRaw] = await Promise.all([
    getSiteConfigValue(`PAYMENT_GATEWAY_${normalizedMethod}_FEE_TYPE`, DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG.type),
    getSiteConfigValue(`PAYMENT_GATEWAY_${normalizedMethod}_FEE_VALUE`, String(DEFAULT_PAYMENT_GATEWAY_FEE_CONFIG.value)),
  ]);

  return normalizePaymentGatewayFeeConfig({
    type: normalizePaymentGatewayFeeType(typeRaw),
    value: Number(valueRaw),
  });
}

/** Upsert a config value and invalidate cache */
export async function setSiteConfig(key: string, value: string): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  invalidateSiteConfigCache();
}

/** Delete a config key (reverts to env default) and invalidate cache */
export async function deleteSiteConfig(key: string): Promise<void> {
  await prisma.siteConfig.deleteMany({ where: { key } });
  invalidateSiteConfigCache();
}

// ── Banner images ─────────────────────────────────────────────────────────────

const DEFAULT_BANNERS: string[] = [
  "https://cdn.vcgamers.com/homepage/temp/6ae27cb7-270f-4af5-ba8d-e7ad76ff11dd.png",
  "https://cdn.vcgamers.com/homepage/temp/7d632226-ef2c-4bbe-b36d-9dc41d65b28a.jpg",
  "https://cdn.vcgamers.com/homepage/temp/69fff244-50fa-42e7-bb3f-f48f8cbd382b.jpg",
  "https://cdn.vcgamers.com/homepage/temp/06b14be4-8413-468b-8746-3ecb2f1af636.png",
];

/** Returns current banner image URLs. Falls back to DEFAULT_BANNERS. */
export async function getBannerImages(): Promise<string[]> {
  const raw = await getSiteConfig("BANNER_IMAGES");
  if (!raw) return DEFAULT_BANNERS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
  } catch { /* corrupt value — fall through */ }
  return DEFAULT_BANNERS;
}

/** Persist banner image URLs to DB. Pass empty array to reset to defaults. */
export async function setBannerImages(urls: string[]): Promise<void> {
  if (urls.length === 0) {
    await deleteSiteConfig("BANNER_IMAGES");
  } else {
    await setSiteConfig("BANNER_IMAGES", JSON.stringify(urls));
  }
}

// ── Helpers for provider modes ────────────────────────────────────────────────

export type ProviderMode = "mock" | "real";
export type PakasirMode = "sandbox" | "production";

const ENV_KEY_MAP: Record<string, string> = {
  PROVIDER_DIGIFLAZZ_MODE: "PROVIDER_DIGIFLAZZ_MODE",
  PROVIDER_VIP_MODE: "PROVIDER_VIP_MODE",
  PROVIDER_PAKASIR_MODE: "PROVIDER_PAKASIR_MODE",
};

/**
 * Get the effective mode for Digiflazz / VIP (mock | real).
 * Priority: DB value → env var → "mock" (safe default)
 */
export async function getProviderMode(configKey: string): Promise<ProviderMode> {
  const dbVal = await getSiteConfig(configKey);
  if (dbVal === "real") return "real";
  if (dbVal === "mock") return "mock";

  // Fall back to env var
  const envKey = ENV_KEY_MAP[configKey] ?? configKey;
  const envVal = process.env[envKey];
  if (envVal?.toLowerCase() === "real") return "real";

  return "mock";
}

/**
 * Get the Pakasir payment gateway mode (sandbox | production).
 * Keduanya memanggil API Pakasir yang nyata — beda hanya di credentials.
 * Priority: DB value → env var → "sandbox" (safe default)
 */
export async function getPakasirMode(): Promise<PakasirMode> {
  const dbVal = await getSiteConfig("PROVIDER_PAKASIR_MODE");
  if (dbVal === "production") return "production";
  if (dbVal === "sandbox") return "sandbox";

  const envVal = process.env.PROVIDER_PAKASIR_MODE;
  if (envVal?.toLowerCase() === "production") return "production";

  return "sandbox";
}

/** Get all three provider modes at once (single cache read) */
export async function getAllProviderModes(): Promise<{
  DIGIFLAZZ: ProviderMode;
  VIP_RESELLER: ProviderMode;
  PAKASIR: PakasirMode;
}> {
  const cfg = await getAllSiteConfig();

  function resolveProviderMode(key: string, envVar: string): ProviderMode {
    const dbVal = cfg[key];
    if (dbVal === "real") return "real";
    if (dbVal === "mock") return "mock";
    const envVal = process.env[envVar];
    if (envVal?.toLowerCase() === "real") return "real";
    return "mock";
  }

  function resolvePakasirMode(): PakasirMode {
    const dbVal = cfg["PROVIDER_PAKASIR_MODE"];
    if (dbVal === "production") return "production";
    if (dbVal === "sandbox") return "sandbox";
    const envVal = process.env.PROVIDER_PAKASIR_MODE;
    if (envVal?.toLowerCase() === "production") return "production";
    return "sandbox";
  }

  return {
    DIGIFLAZZ: resolveProviderMode("PROVIDER_DIGIFLAZZ_MODE", "PROVIDER_DIGIFLAZZ_MODE"),
    VIP_RESELLER: resolveProviderMode("PROVIDER_VIP_MODE", "PROVIDER_VIP_MODE"),
    PAKASIR: resolvePakasirMode(),
  };
}

// ── Flash Sale ────────────────────────────────────────────────────────────────

export interface FlashSaleProduct {
  id: string;
  name: string;
  brand: string;            // brand name
  brandImage: string;       // brand image URL
  badge: string;
  discount: string;         // e.g. "92%"
  originalPrice: string;    // e.g. "Rp51.270"
  price: string;            // flash sale price, e.g. "Rp50.000"
}

export interface FlashSaleConfig {
  isActive: boolean;
  endTime: string;          // ISO datetime — countdown target
  products: FlashSaleProduct[];
}

const DEFAULT_FLASH_SALE: FlashSaleConfig = {
  isActive: false,
  endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2 jam
  products: [],
};

export async function getFlashSaleConfig(): Promise<FlashSaleConfig> {
  const raw = await getSiteConfig("FLASH_SALE_CONFIG");
  if (!raw) return DEFAULT_FLASH_SALE;
  try {
    const parsed = JSON.parse(raw) as Partial<FlashSaleConfig>;
    return {
      isActive: parsed.isActive ?? false,
      endTime: parsed.endTime ?? DEFAULT_FLASH_SALE.endTime,
      products: Array.isArray(parsed.products) ? parsed.products : [],
    };
  } catch {
    return DEFAULT_FLASH_SALE;
  }
}

export async function setFlashSaleConfig(cfg: FlashSaleConfig): Promise<void> {
  await setSiteConfig("FLASH_SALE_CONFIG", JSON.stringify(cfg));
}

// ── Home Content (Game Tags + FAQ) ────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GameTag {
  label: string;
  href: string;
}

export interface HomeContent {
  gameTags: GameTag[];
  faqs: FaqItem[];
  aboutText: string;
}

const DEFAULT_HOME_CONTENT: HomeContent = {
  gameTags: [
    { label: "Top Up Free Fire", href: "/brand/free-fire" },
    { label: "Top Up Mobile Legends", href: "/brand/mobile-legends" },
    { label: "Top Up Blood Strike", href: "/brand/blood-strike" },
    { label: "Top Up Free Fire Max", href: "/brand/free-fire-max" },
    { label: "Top Up PUBG Mobile", href: "/brand/pubg-mobile" },
    { label: "Top Up Crystal of Atlan", href: "/brand/crystal-of-atlan" },
    { label: "Top Up Ragnarok M Classic", href: "/brand/ragnarok-m-classic" },
    { label: "Top Up Undawn", href: "/brand/undawn" },
    { label: "Top Up Valorant", href: "/brand/valorant" },
    { label: "Top Up Rbx Rbl", href: "/brand/rbx-rbl" },
  ],
  aboutText:
    "Platform ini adalah tempat top up game dan produk digital yang aman, praktis, dan nyaman digunakan. Selain bisa membeli voucher game atau produk digital dengan mudah, kamu juga bisa berjualan sebagai seller atau menjadi mitra dengan pengalaman yang lebih fleksibel.",
  faqs: [
    {
      question: "Apakah top up game di platform ini aman dan legal?",
      answer: "Platform ini dirancang untuk transaksi top up game dan produk digital yang aman. Seluruh transaksi dilindungi dengan sistem keamanan yang memadai dan diproses sesuai ketentuan layanan yang berlaku.",
    },
    {
      question: "Apa saja keuntungan top up game di platform ini?",
      answer: "Berbagai keuntungan menanti Anda: proses instan 24/7, harga kompetitif dengan promo menarik, metode pembayaran lengkap, customer service responsif, dan sistem keamanan berlapis untuk melindungi data Anda.",
    },
    {
      question: "Berapa lama proses top up selesai?",
      answer: "Proses top up biasanya selesai dalam 1-5 menit setelah pembayaran dikonfirmasi. Untuk beberapa game tertentu, proses bisa lebih cepat yakni kurang dari 1 menit.",
    },
    {
      question: "Metode pembayaran apa saja yang tersedia?",
      answer: "Kami menyediakan berbagai metode pembayaran untuk kemudahan Anda: Transfer Bank (BCA, BRI, Mandiri, BNI), E-Wallet (GoPay, OVO, DANA, ShopeePay), QRIS, Virtual Account, dan pulsa.",
    },
    {
      question: "Bagaimana cara top up game di platform ini?",
      answer: "Sangat mudah! Pilih game yang ingin di-top up, masukkan ID game Anda, pilih nominal diamond/UC yang diinginkan, pilih metode pembayaran, lakukan pembayaran, dan diamond/UC akan otomatis masuk ke akun game Anda.",
    },
    {
      question: "Apakah ada biaya admin untuk setiap transaksi?",
      answer: "Tidak ada biaya admin tersembunyi. Harga yang tertera sudah final dan sudah termasuk semua biaya yang berlaku. Kami berkomitmen untuk transparansi harga kepada semua pelanggan.",
    },
    {
      question: "Bagaimana jika top up saya gagal atau terlambat?",
      answer: "Jika terjadi kendala, tim customer service kami siap membantu 24/7 melalui WhatsApp atau Live Chat. Kami akan segera memproses pengembalian dana atau menyelesaikan masalah top up Anda dengan cepat.",
    },
  ],
};

export async function getHomeContent(): Promise<HomeContent> {
  const raw = await getSiteConfig("HOME_CONTENT");
  if (!raw) return DEFAULT_HOME_CONTENT;
  try {
    const parsed = JSON.parse(raw) as Partial<HomeContent>;
    return {
      gameTags: Array.isArray(parsed.gameTags) && parsed.gameTags.length > 0 &&
        typeof (parsed.gameTags as unknown[])[0] === "object"
        ? parsed.gameTags as { label: string; href: string }[]
        : DEFAULT_HOME_CONTENT.gameTags,
      faqs: Array.isArray(parsed.faqs) && parsed.faqs.length > 0
        ? parsed.faqs
        : DEFAULT_HOME_CONTENT.faqs,
      aboutText: typeof parsed.aboutText === "string" && parsed.aboutText.trim()
        ? parsed.aboutText
        : DEFAULT_HOME_CONTENT.aboutText,
    };
  } catch {
    return DEFAULT_HOME_CONTENT;
  }
}

export async function setHomeContent(content: HomeContent): Promise<void> {
  await setSiteConfig("HOME_CONTENT", JSON.stringify(content));
}
