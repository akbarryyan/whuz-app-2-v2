/**
 * POST /api/admin/transactions/reconcile-all
 *
 * Bulk reconcile all stale PROCESSING_PROVIDER / PAID orders.
 * Admin only.
 */

import { NextResponse } from "next/server";
import { ReconcileOrderService } from "@/src/core/services/provider/reconcile-order.service";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const reconcileService = new ReconcileOrderService(
  new OrderRepository(),
);

export async function POST() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const result = await reconcileService.reconcileStaleOrders();

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[POST /api/admin/transactions/reconcile-all]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
