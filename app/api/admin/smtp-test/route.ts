/**
 * POST /api/admin/smtp-test — send a test email to verify SMTP configuration
 */

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSiteConfig, getSiteName } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
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
      user ||
      "noreply@whuzpay.com";
    const brandName = await getSiteName();

    if (!host || !user || !pass) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SMTP belum dikonfigurasi lengkap. Pastikan Host, User, dan Password sudah diisi lalu simpan terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user, pass },
    });

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #003D99, #0052CC); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${brandName}</h1>
          <p style="color: #94b8ff; margin: 8px 0 0; font-size: 14px;">SMTP Test Email</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 0 0 16px;">
            <span style="font-size: 32px;">✅</span>
            <p style="color: #166534; font-size: 16px; font-weight: 700; margin: 12px 0 4px;">Konfigurasi SMTP Berhasil!</p>
            <p style="color: #15803d; font-size: 13px; margin: 0;">Email ini membuktikan bahwa pengaturan SMTP Anda berfungsi dengan baik.</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Dikirim pada: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</p>
        </div>
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Email test dari Admin Dashboard ${brandName}.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${brandName}" <${from}>`,
      to: user, // send to the SMTP user's own email
      subject: `[${brandName}] ✅ Test SMTP — Konfigurasi Berhasil`,
      html: htmlBody,
    });

    return NextResponse.json({ success: true, to: user });
  } catch (error) {
    console.error("[SMTP-TEST] Error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal mengirim email test";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
