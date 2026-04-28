import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { isOtpAuthEnabled } from "@/lib/auth-config";
import { prisma } from "@/src/infra/db/prisma";
import { normalizePhone, isValidPhone } from "@/lib/fonnte";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password, method } = body;
    // method: "whatsapp" | "email"
    // identifier: nomor WA atau email

    // --- Validasi input ---
    if (!identifier || !password || !method) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (!["whatsapp", "email"].includes(method)) {
      return NextResponse.json(
        { success: false, message: "Metode login tidak valid." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    // --- Cari user ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any;

    if (method === "email") {
      const email = identifier.toLowerCase().trim();
      if (!email.includes("@")) {
        return NextResponse.json(
          { success: false, message: "Format email tidak valid." },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          passwordHash: true,
          isActive: true,
        },
      });
    } else {
      // method === "whatsapp"
      const phone = normalizePhone(identifier);
      if (!isValidPhone(phone)) {
        return NextResponse.json(
          {
            success: false,
            message: "Format nomor WhatsApp tidak valid.",
          },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          passwordHash: true,
          isActive: true,
        },
      });
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            method === "email"
              ? "Email atau password salah."
              : "Nomor WA atau password salah.",
        },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Akun Anda dinonaktifkan. Hubungi admin." },
        { status: 403 }
      );
    }

    // --- Verifikasi password ---
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            method === "email"
              ? "Email atau password salah."
              : "Nomor WA atau password salah.",
        },
        { status: 401 }
      );
    }

    if (!isOtpAuthEnabled()) {
      const session = await getSession();
      session.isLoggedIn = true;
      session.userId = user.id;
      session.email = user.email ?? "";
      session.phone = user.phone ?? "";
      session.name = user.name ?? "";
      session.role = user.role;
      await session.save();

      return NextResponse.json({
        success: true,
        message: "Login berhasil! Selamat datang kembali.",
        requireOtp: false,
        userId: user.id,
      });
    }

    // --- Password valid! Return success without setting session ---
    // Session akan di-set setelah OTP verified
    return NextResponse.json({
      success: true,
      message: "Password valid. Silakan verifikasi OTP.",
      requireOtp: true,
      userId: user.id,
    });
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
