import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { getSiteName } from "@/lib/site-config";
import { prisma } from "@/src/infra/db/prisma";
import { normalizePhone, isValidPhone } from "@/lib/fonnte";

export async function POST(req: NextRequest) {
  try {
    const siteName = await getSiteName();
    const body = await req.json();
    const { name, email, phone, password, confirmPassword } = body;

    // --- Validasi input ---
    if (!name || !email || !phone || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Nama minimal 2 karakter." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Format email tidak valid." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { success: false, message: "Format nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxx." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Konfirmasi password tidak cocok." },
        { status: 400 }
      );
    }

    // --- Cek email sudah terdaftar ---
    const existingByEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (existingByEmail) {
      return NextResponse.json(
        { success: false, message: "Email sudah terdaftar. Gunakan email lain atau login." },
        { status: 409 }
      );
    }

    // --- Cek phone sudah terdaftar ---
    const existingByPhone = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      select: { id: true },
    });

    if (existingByPhone) {
      return NextResponse.json(
        { success: false, message: "Nomor WhatsApp sudah terdaftar. Gunakan nomor lain atau login." },
        { status: 409 }
      );
    }

    // --- Hash password ---
    const passwordHash = await bcrypt.hash(password, 10);

    // --- Buat user baru ---
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: normalizedPhone,
        passwordHash,
        role: "MEMBER",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
      },
    });

    // --- Auto-login setelah register ---
    const session = await getSession();
    session.isLoggedIn = true;
    session.userId = newUser.id;
    session.email = newUser.email ?? "";
    session.phone = newUser.phone ?? "";
    session.name = newUser.name ?? "";
    session.role = newUser.role;
    await session.save();

    return NextResponse.json({
      success: true,
      message: `Akun berhasil dibuat! Selamat datang di ${siteName}.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("[AUTH REGISTER ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
