import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();

    return NextResponse.json({
      success: true,
      message: "Berhasil logout.",
    });
  } catch (error) {
    console.error("[AUTH LOGOUT ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    );
  }
}
