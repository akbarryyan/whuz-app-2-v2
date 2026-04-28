/**
 * GET /api/orders/[code]?token=<viewToken>
 *
 * For guest: requires ?token= (raw viewToken). Hash is computed and compared to DB.
 * For member: session userId must match order.userId.
 *
 * Rule: No business logic — parse/validate/query/respond.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { getSession } from "@/lib/session";
import { syncExpiredOrderByCode } from "@/src/core/services/order/sync-expired-orders.service";

export const dynamic = "force-dynamic";

const orderRepo = new OrderRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get("token");

    await syncExpiredOrderByCode(code);

    // ── Fetch order ────────────────────────────────────────────────────────
    const order = await orderRepo.findByCode(code);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // ── Access control ─────────────────────────────────────────────────────
    const session = await getSession();
    const sessionUserId = session.isLoggedIn ? session.userId : null;

    if (order.userId) {
      // Member order — must be owner or admin
      if (session.role !== "ADMIN" && sessionUserId !== order.userId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Guest order — requires valid view token
      if (!rawToken) {
        return NextResponse.json(
          { success: false, error: "Access token required for guest orders" },
          { status: 401 }
        );
      }

      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      if (!order.viewTokenHash || order.viewTokenHash !== tokenHash) {
        return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });
      }
    }

    // ── Shape response (minimal — no internal fields) ──────────────────────
    return NextResponse.json({
      success: true,
      data: {
        orderCode: order.orderCode,
        status: order.status,
        product: {
          name: order.product.name,
          category: order.product.category,
          brand: order.product.brand,
        },
        targetNumber: order.targetNumber,
        targetData: order.targetData,
        notes: order.notes ?? null,
        amount: Number(order.amount),
        basePrice: Number(order.basePrice),
        markup: Number(order.markup),
        fee: Number(order.fee),
        paymentMethod: order.paymentMethod,
        serialNumber: order.serialNumber ?? null,
        paymentInvoice: order.paymentInvoice
          ? {
              status: order.paymentInvoice.status,
              paymentUrl: order.paymentInvoice.paymentUrl,
              paymentNumber: order.paymentInvoice.paymentNumber,
              method: order.paymentInvoice.method,
              expiredAt: order.paymentInvoice.expiredAt,
              paidAt: order.paymentInvoice.paidAt,
            }
          : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (err) {
    console.error("[GET /api/orders/[code]]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
