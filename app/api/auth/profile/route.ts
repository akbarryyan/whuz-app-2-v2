import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phone } = body;

    // Validasi
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Nama minimal 2 karakter." },
        { status: 400 }
      );
    }

    // Jika phone diisi, cek tidak duplicate
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
          { success: false, message: "Nomor HP sudah digunakan akun lain." },
          { status: 409 }
        );
      }
    }

    // Update user
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name.trim(),
        phone: phone && phone.trim() ? phone.trim() : null,
      },
      select: { id: true, name: true, phone: true },
    });

    // Update session name
    session.name = updated.name ?? "";
    await session.save();

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui.",
      user: updated,
    });
  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
