/**
 * GET  /api/admin/profile — Ambil data profil admin yang sedang login
 * PATCH /api/admin/profile — Update email, nama & nomor HP admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    console.error("[GET /api/admin/profile]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, phone } = body;

    if (!email || typeof email !== "string" || !email.trim().includes("@")) {
      return NextResponse.json(
        { success: false, error: "Email tidak valid." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Nama minimal 2 karakter." },
        { status: 400 }
      );
    }

    // Cek duplikat email
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        id: { not: session.userId },
      },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email sudah digunakan akun lain." },
        { status: 409 }
      );
    }

    // Cek duplikat nomor HP
    if (phone && typeof phone === "string" && phone.trim()) {
      const existing = await prisma.user.findFirst({
        where: {
          phone: phone.trim(),
          id: { not: session.userId },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Nomor HP sudah digunakan akun lain." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone && phone.trim() ? phone.trim() : null,
      },
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true, isActive: true },
    });

    // Update nama & email di session
    session.name = updated.name ?? "";
    session.email = updated.email as string;
    await session.save();

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/profile]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
