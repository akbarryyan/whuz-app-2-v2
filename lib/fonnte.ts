/**
 * Fonnte WhatsApp API Helper
 * Docs: https://docs.fonnte.com/api-send-message/
 *
 * Token priority: SiteConfig DB (key: "FONNTE_TOKEN") → .env FONNTE_TOKEN
 */

import { getSiteConfig } from "@/lib/site-config";

/**
 * Ambil Fonnte token dari SiteConfig (DB) dulu, fallback ke .env
 */
async function getFonnteToken(): Promise<string | null> {
  // Priority 1: dari database (diatur di admin dashboard)
  const dbToken = await getSiteConfig("FONNTE_TOKEN");
  if (dbToken && dbToken.trim()) return dbToken.trim();

  // Priority 2: dari .env
  const envToken = process.env.FONNTE_TOKEN;
  if (envToken && envToken.trim()) return envToken.trim();

  return null;
}

/**
 * Kirim pesan WhatsApp via Fonnte API
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; detail?: string }> {
  const token = await getFonnteToken();

  if (!token) {
    console.error("[FONNTE] Token belum dikonfigurasi. Set via Admin Dashboard atau .env");
    return { success: false, detail: "Fonnte token belum dikonfigurasi" };
  }

  try {
    const formData = new FormData();
    formData.append("target", phone);
    formData.append("message", message);
    formData.append("countryCode", "62"); // otomatis ganti 08xxx → 628xxx

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: formData,
    });

    const data = await res.json();
    console.log("[FONNTE] Response:", JSON.stringify(data));

    return {
      success: data.status === true,
      detail: data.detail || data.reason || "Unknown",
    };
  } catch (error) {
    console.error("[FONNTE] Error:", error);
    return { success: false, detail: "Network error" };
  }
}

/**
 * Generate 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalisasi nomor telepon ke format 08xxx
 * Input bisa: 08xxx, +628xxx, 628xxx
 * Output: 08xxx
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("62")) cleaned = "0" + cleaned.slice(2);
  if (!cleaned.startsWith("0")) cleaned = "0" + cleaned;
  return cleaned;
}

/**
 * Validasi nomor telepon Indonesia (setelah normalisasi)
 * Format: 08xxxxxxxxx (10-14 digit)
 */
export function isValidPhone(phone: string): boolean {
  return /^08\d{8,12}$/.test(phone);
}
