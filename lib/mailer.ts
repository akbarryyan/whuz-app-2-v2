/**
 * Email OTP Helper
 * Uses Nodemailer to send OTP codes via email.
 *
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Falls back to SiteConfig DB keys if .env is not set:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";
import { DEFAULT_SITE_NAME, getSiteConfig, getSiteName } from "@/lib/site-config";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * Get SMTP config from SiteConfig (DB) first, fallback to .env
 */
async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const host =
    (await getSiteConfig("SMTP_HOST")) || process.env.SMTP_HOST || "";
  const port =
    (await getSiteConfig("SMTP_PORT")) || process.env.SMTP_PORT || "587";
  const user =
    (await getSiteConfig("SMTP_USER")) || process.env.SMTP_USER || "";
  const pass =
    (await getSiteConfig("SMTP_PASS")) || process.env.SMTP_PASS || "";
  const from =
    (await getSiteConfig("SMTP_FROM")) ||
    process.env.SMTP_FROM ||
    "noreply@whuzpay.com";

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port: parseInt(port, 10), user, pass, from };
}

async function getMailBrandName(): Promise<string> {
  return (await getSiteName()) || DEFAULT_SITE_NAME;
}

/**
 * Send OTP email
 */
export async function sendOtpEmail(
  toEmail: string,
  code: string,
  purpose: "LOGIN" | "REGISTER" | "RESET_PASSWORD"
): Promise<{ success: boolean; detail?: string }> {
  const config = await getSmtpConfig();
  const brandName = await getMailBrandName();

  if (!config) {
    console.error(
      "[MAILER] SMTP belum dikonfigurasi. Set via Admin Dashboard atau .env"
    );
    return { success: false, detail: "SMTP belum dikonfigurasi" };
  }

  const actionLabel = purpose === "LOGIN" ? "masuk" : purpose === "REGISTER" ? "mendaftar" : "reset password";

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #003D99, #0052CC); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${brandName}</h1>
        <p style="color: #94b8ff; margin: 8px 0 0; font-size: 14px;">Kode OTP untuk ${actionLabel}</p>
      </div>
      <div style="padding: 32px 24px; text-align: center;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 24px;">Gunakan kode berikut untuk ${actionLabel} ke akun ${brandName} Anda:</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #003D99;">${code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Kode berlaku <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapapun.</p>
      </div>
      <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: `"${brandName}" <${config.from}>`,
      to: toEmail,
      subject: `[${brandName}] Kode OTP Anda: ${code}`,
      html: htmlBody,
    });

    return { success: true };
  } catch (error) {
    console.error("[MAILER] Error:", error);
    return { success: false, detail: "Gagal mengirim email" };
  }
}
