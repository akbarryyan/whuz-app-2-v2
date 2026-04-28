import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/infra/db/prisma";
import { normalizePhone, isValidPhone } from "@/lib/fonnte";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, method, code, newPassword, confirmPassword } = body;
    // method: "whatsapp" | "email"

    // --- Validasi input ---
    if (!identifier || !method || !code || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (!["whatsapp", "email"].includes(method)) {
      return NextResponse.json(
        { success: false, message: "Metode tidak valid." },
        { status: 400 }
      );
    }

    if (typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: "Kode OTP harus 6 digit angka." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password baru minimal 8 karakter." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Konfirmasi password tidak cocok." },
        { status: 400 }
      );
    }

    // --- Normalisasi identifier ---
    let normalizedPhone = "";
    let normalizedEmail = "";

    if (method === "whatsapp") {
      normalizedPhone = normalizePhone(identifier);
      if (!isValidPhone(normalizedPhone)) {
        return NextResponse.json(
          { success: false, message: "Format nomor WhatsApp tidak valid." },
          { status: 400 }
        );
      }
    } else {
      normalizedEmail = identifier.toLowerCase().trim();
      if (!normalizedEmail.includes("@")) {
        return NextResponse.json(
          { success: false, message: "Format email tidak valid." },
          { status: 400 }
        );
      }
    }

    // --- Cari user ---
    const whereUser =
      method === "whatsapp"
        ? { phone: normalizedPhone }
        : { email: normalizedEmail };

    const user = await prisma.user.findFirst({
      where: whereUser,
      select: { id: true, isActive: true },
    });

    if (!user) {
      const label = method === "whatsapp" ? "Nomor WhatsApp" : "Email";
      return NextResponse.json(
        { success: false, message: `${label} tidak ditemukan.` },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Akun dinonaktifkan. Hubungi admin." },
        { status: 403 }
      );
    }

    // --- Verifikasi OTP (purpose: RESET_PASSWORD) ---
    const whereOtp =
      method === "whatsapp"
        ? {
            phone: normalizedPhone,
            target: "whatsapp",
            purpose: "RESET_PASSWORD",
            verified: false,
            expiresAt: { gt: new Date() },
          }
        : {
            email: normalizedEmail,
            target: "email",
            purpose: "RESET_PASSWORD",
            verified: false,
            expiresAt: { gt: new Date() },
          };

    const otp = await prisma.otpCode.findFirst({
      where: whereOtp,
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json(
        {
          success: false,
          message: "Kode OTP sudah expired atau tidak ditemukan. Kirim ulang OTP.",
        },
        { status: 400 }
      );
    }

    if (otp.attempts >= 5) {
      return NextResponse.json(
        { success: false, message: "Terlalu banyak percobaan salah. Kirim OTP baru." },
        { status: 429 }
      );
    }

    if (otp.code !== code) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 4 - otp.attempts;
      return NextResponse.json(
        {
          success: false,
          message: `Kode OTP salah. ${
            remaining > 0 ? `Sisa ${remaining} percobaan.` : "Kirim OTP baru."
          }`,
        },
        { status: 401 }
      );
    }

    // --- OTP valid! Tandai sebagai verified ---
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // --- Update password ---
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: "Password berhasil direset! Silakan login dengan password baru.",
    });
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
