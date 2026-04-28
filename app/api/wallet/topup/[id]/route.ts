/**
 * GET /api/wallet/topup/[id]
 *
 * Poll the status of a wallet top-up by its database ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/infra/db/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const topup = await prisma.walletTopup.findFirst({
      where: {
        id,
        userId: session.userId, // ensure ownership
      },
      select: {
        id: true,
        topupCode: true,
        amount: true,
        fee: true,
        totalPayment: true,
        status: true,
        paymentMethod: true,
        paymentUrl: true,
        paymentNumber: true,
        expiredAt: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!topup) {
      return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...topup,
        amount: Number(topup.amount),
        fee: Number(topup.fee),
        totalPayment: Number(topup.totalPayment),
      },
    });
  } catch (err) {
    console.error("[GET /api/wallet/topup/:id]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
