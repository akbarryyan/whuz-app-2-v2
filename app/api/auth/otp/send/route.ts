import { NextRequest, NextResponse } from "next/server";
import { isOtpAuthEnabled } from "@/lib/auth-config";
import { prisma } from "@/src/infra/db/prisma";
import {
  sendWhatsAppMessage,
  generateOTP,
  normalizePhone,
  isValidPhone,
} from "@/lib/fonnte";
import { sendOtpEmail } from "@/lib/mailer";
import { getSiteName } from "@/lib/site-config";

export async function POST(req: NextRequest) {
  try {
    const siteName = await getSiteName();
    const body = await req.json();
    const { phone, email, purpose, target } = body;
    // target: "whatsapp" | "email"

    // --- Validasi input ---
    if (!purpose || !target) {
      return NextResponse.json(
        { success: false, message: "Data tidak lengkap." },
        { status: 400 }
      );
    }

    if (!["LOGIN", "REGISTER", "RESET_PASSWORD"].includes(purpose)) {
      return NextResponse.json(
        { success: false, message: "Tujuan tidak valid." },
        { status: 400 }
      );
    }

    if (purpose !== "RESET_PASSWORD" && !isOtpAuthEnabled()) {
      return NextResponse.json(
        {
          success: false,
          message: "Verifikasi OTP sedang dinonaktifkan sementara.",
        },
        { status: 503 }
      );
    }

    if (!["whatsapp", "email"].includes(target)) {
      return NextResponse.json(
        { success: false, message: "Target OTP tidak valid." },
        { status: 400 }
      );
    }

    // --- Validasi berdasarkan target ---
    let normalizedPhone = "";
    let normalizedEmail = "";

    if (target === "whatsapp") {
      if (!phone) {
        return NextResponse.json(
          { success: false, message: "Nomor WhatsApp wajib diisi." },
          { status: 400 }
        );
      }
      normalizedPhone = normalizePhone(phone);
      if (!isValidPhone(normalizedPhone)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Format nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxx.",
          },
          { status: 400 }
        );
      }
    } else {
      // target === "email"
      if (!email) {
        return NextResponse.json(
          { success: false, message: "Email wajib diisi." },
          { status: 400 }
        );
      }
      normalizedEmail = email.toLowerCase().trim();
      if (!normalizedEmail.includes("@")) {
        return NextResponse.json(
          { success: false, message: "Format email tidak valid." },
          { status: 400 }
        );
      }
    }

    // --- Rate limit: max 5 OTP per identifier per jam ---
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const whereRateLimit =
      target === "whatsapp"
        ? { phone: normalizedPhone, createdAt: { gte: oneHourAgo } }
        : { email: normalizedEmail, createdAt: { gte: oneHourAgo } };

    const recentCount = await prisma.otpCode.count({ where: whereRateLimit });

    if (recentCount >= 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Terlalu banyak percobaan. Coba lagi dalam 1 jam.",
        },
        { status: 429 }
      );
    }

    // --- Cooldown: minimal 60 detik antar OTP ---
    const whereCooldown =
      target === "whatsapp"
        ? { phone: normalizedPhone }
        : { email: normalizedEmail };

    const lastOtp = await prisma.otpCode.findFirst({
      where: whereCooldown,
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < 60000) {
      const remaining = Math.ceil(
        (60000 - (Date.now() - lastOtp.createdAt.getTime())) / 1000
      );
      return NextResponse.json(
        {
          success: false,
          message: `Tunggu ${remaining} detik sebelum mengirim OTP baru.`,
        },
        { status: 429 }
      );
    }

    // --- Cek berdasarkan purpose ---
    if (purpose === "LOGIN" || purpose === "RESET_PASSWORD") {
      // Cari user berdasarkan target — user harus sudah terdaftar
      const whereUser =
        target === "whatsapp"
          ? { phone: normalizedPhone }
          : { email: normalizedEmail };

      const user = await prisma.user.findFirst({
        where: whereUser,
        select: { id: true, isActive: true },
      });

      if (!user) {
        const label =
          target === "whatsapp" ? "Nomor WhatsApp" : "Email";
        return NextResponse.json(
          {
            success: false,
            message: `${label} belum terdaftar. Silakan daftar terlebih dahulu.`,
          },
          { status: 404 }
        );
      }

      if (!user.isActive) {
        return NextResponse.json(
          { success: false, message: "Akun dinonaktifkan. Hubungi admin." },
          { status: 403 }
        );
      }
    } else {
      // REGISTER — pastikan identifier belum terdaftar
      if (target === "whatsapp") {
        const existing = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
          select: { id: true },
        });
        if (existing) {
          return NextResponse.json(
            {
              success: false,
              message: "Nomor WhatsApp sudah terdaftar. Silakan login.",
            },
            { status: 409 }
          );
        }
      } else {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
        if (existing) {
          return NextResponse.json(
            {
              success: false,
              message: "Email sudah terdaftar. Silakan login.",
            },
            { status: 409 }
          );
        }
      }
    }

    // --- Generate & simpan OTP ---
    const code = generateOTP();

    await prisma.otpCode.create({
      data: {
        phone: target === "whatsapp" ? normalizedPhone : null,
        email: target === "email" ? normalizedEmail : null,
        target,
        code,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // expired 5 menit
      } as Parameters<typeof prisma.otpCode.create>[0]["data"],
    });

    // --- Kirim OTP ---
    const actionLabel = purpose === "LOGIN" ? "masuk" : purpose === "REGISTER" ? "mendaftar" : "reset password";

    if (target === "whatsapp") {
      const message = `*[${siteName}]* Kode OTP Anda untuk ${actionLabel}:\n\n*${code}*\n\nJangan bagikan kode ini kepada siapapun.\nKode berlaku 5 menit.`;
      const result = await sendWhatsAppMessage(normalizedPhone, message);

      if (!result.success) {
        console.error("[OTP SEND] Fonnte gagal:", result.detail);
        return NextResponse.json(
          {
            success: false,
            message: "Gagal mengirim OTP. Coba lagi nanti.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Kode OTP berhasil dikirim ke WhatsApp Anda.",
      });
    } else {
      // target === "email"
      const result = await sendOtpEmail(normalizedEmail, code, purpose);

      if (!result.success) {
        console.error("[OTP SEND] Email gagal:", result.detail);
        return NextResponse.json(
          {
            success: false,
            message: "Gagal mengirim OTP ke email. Coba lagi nanti.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Kode OTP berhasil dikirim ke email Anda.",
      });
    }
  } catch (error) {
    console.error("[OTP SEND ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
