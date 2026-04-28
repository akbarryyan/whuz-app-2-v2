import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_METHODS = [
  { key: "qris", label: "QRIS", group: "QRIS", imageUrl: null, sortOrder: 1 },
];

/**
 * GET /api/admin/payment-methods
 * Returns ALL payment methods (active + inactive), seeding current defaults if empty.
 */
export async function GET() {
  try {
    const count = await prisma.paymentMethod.count();
    if (count === 0) {
      await prisma.paymentMethod.createMany({
        data: DEFAULT_METHODS.map((m) => ({ ...m, isActive: true })),
        skipDuplicates: true,
      });
    }

    const methods = await prisma.paymentMethod.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: methods });
  } catch (error) {
    console.error("[ADMIN PAYMENT METHODS GET ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memuat data." }, { status: 500 });
  }
}

/**
 * POST /api/admin/payment-methods
 * Create a new payment method.
 * Body: { key, label, group, imageUrl?, sortOrder? }
 */
export async function POST(req: NextRequest) {
  try {
    const { key, label, group, imageUrl, sortOrder } = await req.json();
    if (!key || !label || !group) {
      return NextResponse.json({ success: false, error: "key, label, dan group wajib diisi." }, { status: 400 });
    }

    const existing = await prisma.paymentMethod.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Key sudah digunakan." }, { status: 409 });
    }

    const method = await prisma.paymentMethod.create({
      data: { key, label, group, imageUrl: imageUrl || null, sortOrder: sortOrder ?? 99, isActive: true },
    });

    return NextResponse.json({ success: true, data: method });
  } catch (error) {
    console.error("[ADMIN PAYMENT METHODS POST ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal membuat metode pembayaran." }, { status: 500 });
  }
}
