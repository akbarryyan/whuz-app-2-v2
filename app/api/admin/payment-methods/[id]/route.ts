import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/payment-methods/[id]
 * Update label, group, imageUrl, isActive, sortOrder
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const allowed = ["label", "group", "imageUrl", "isActive", "sortOrder"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada field yang diubah." }, { status: 400 });
    }

    const method = await prisma.paymentMethod.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: method });
  } catch (error) {
    console.error("[ADMIN PAYMENT METHODS PATCH ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal memperbarui." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/payment-methods/[id]
 * Delete a payment method permanently.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.paymentMethod.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN PAYMENT METHODS DELETE ERROR]", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus." }, { status: 500 });
  }
}
