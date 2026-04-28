import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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
    const body = (await req.json()) as Partial<{
      label: string;
      group: string;
      imageUrl: string | null;
      isActive: boolean;
      sortOrder: number;
    }>;

    const data: Prisma.PaymentMethodUpdateInput = {};
    if (body.label !== undefined) data.label = body.label;
    if (body.group !== undefined) data.group = body.group;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

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
