import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";
import { syncExpiredOrdersForUser } from "@/src/core/services/order/sync-expired-orders.service";

// Status grup per tab
const TAB_STATUSES: Record<string, string[]> = {
  menunggu: ["CREATED", "WAITING_PAYMENT"],
  diproses: ["PAID", "PROCESSING_PROVIDER"],
  dikirim: [],          // digital product — no shipping; kept for UI parity
  selesai: ["SUCCESS"],
  dibatalkan: ["FAILED", "EXPIRED", "REFUNDED"],
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await syncExpiredOrdersForUser(session.userId);

    const { searchParams } = req.nextUrl;
    const tab = searchParams.get("tab") ?? "menunggu";
    const q   = (searchParams.get("q") ?? "").trim().toLowerCase();
    const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 15;
    const skip  = (page - 1) * limit;

    const statuses = TAB_STATUSES[tab] ?? [];

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: session.userId,
      ...(statuses.length > 0 ? { status: { in: statuses } } : { status: { in: [] } }),
    };

    if (q) {
      where.OR = [
        { orderCode: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
        { product: { brand: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          orderCode: true,
          status: true,
          amount: true,
          paymentMethod: true,
          targetNumber: true,
          serialNumber: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({
        ...o,
        amount: Number(o.amount),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[TRANSAKSI API ERROR]", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan" }, { status: 500 });
  }
}
