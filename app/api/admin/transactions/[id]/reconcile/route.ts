/**
 * POST /api/admin/transactions/[id]/reconcile
 *
 * Manually trigger reconcile for a single order.
 * Admin only. No business logic here — delegates to ReconcileOrderService.
 */

import { NextResponse } from "next/server";
import { ReconcileOrderService } from "@/src/core/services/provider/reconcile-order.service";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const reconcileService = new ReconcileOrderService(
  new OrderRepository(),
);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Admin guard ────────────────────────────────────────────────────────
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const result = await reconcileService.reconcile(id);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[POST /api/admin/transactions/[id]/reconcile]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
