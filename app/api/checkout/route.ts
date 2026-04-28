/**
 * POST /api/checkout
 *
 * Rule: Route handler only parses input, validates with Zod, calls service, returns response.
 * No business logic here — voucher validation is a lightweight lookup only.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateCheckoutService } from "@/src/core/services/checkout/create-checkout.service";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { PoppayAdapter } from "@/src/infra/payment/poppay/poppay.adapter";
import { isPoppayConfigured } from "@/src/infra/payment/poppay/poppay.client";
import { getSession } from "@/lib/session";
import { prisma } from "@/src/infra/db/prisma";
import {
  ValidationError,
  GuestWalletError,
  InsufficientBalanceError,
  NotFoundError,
} from "@/src/core/domain/errors/domain.errors";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  productId: z.string().min(1),
  sellerProductId: z.string().min(1).optional(),
  targetNumber: z.string().min(1),
  targetData: z.record(z.string(), z.any()).optional(),
  whatsapp: z.string().max(20).optional(),
  paymentMethod: z.enum(["WALLET", "PAYMENT_GATEWAY"]),
  paymentGatewayMethod: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  voucherCode: z.string().max(50).optional(),
});

/** Validate a voucher code and return the discount amount to apply. Returns 0 if invalid. */
async function resolveVoucherDiscount(
  code: string | undefined,
  baseAmount: number,
  userId: string | null
): Promise<{ discountAmount: number; voucherId: string | null }> {
  if (!code) return { discountAmount: 0, voucherId: null };

  const voucher = await prisma.voucher.findUnique({ where: { code: code.toUpperCase() } });
  if (!voucher || !voucher.isActive) return { discountAmount: 0, voucherId: null };

  const now = new Date();
  if (voucher.startDate && now < voucher.startDate) return { discountAmount: 0, voucherId: null };
  if (voucher.endDate && now > voucher.endDate) return { discountAmount: 0, voucherId: null };
  if (voucher.quota !== null && voucher.usedCount >= voucher.quota) return { discountAmount: 0, voucherId: null };
  if (baseAmount < Number(voucher.minPurchase)) return { discountAmount: 0, voucherId: null };

  if (userId) {
    const uses = await prisma.voucherClaim.count({ where: { voucherId: voucher.id, userId } });
    if (uses >= voucher.perUserLimit) return { discountAmount: 0, voucherId: null };
  }

  let discountAmount = 0;
  if (voucher.discountType === "FIXED") {
    discountAmount = Number(voucher.discountValue);
  } else {
    discountAmount = Math.floor((baseAmount * Number(voucher.discountValue)) / 100);
    if (voucher.maxDiscount !== null) {
      discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
    }
  }
  discountAmount = Math.min(discountAmount, baseAmount - 1);

  return { discountAmount, voucherId: voucher.id };
}

/** Mark voucher as used after a successful order. Creates or updates the VoucherClaim. */
async function markVoucherUsed(voucherId: string, userId: string | null, orderId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      if (userId) {
        // Upsert claim: either the user already claimed it on /voucher page, or it's a direct-use at checkout
        const existing = await tx.voucherClaim.findUnique({
          where: { voucherId_userId: { voucherId, userId } },
        });
        if (existing) {
          await tx.voucherClaim.update({
            where: { id: existing.id },
            data: { status: "USED", usedAt: new Date(), orderId },
          });
        } else {
          await tx.voucherClaim.create({
            data: { voucherId, userId, status: "USED", usedAt: new Date(), orderId },
          });
        }
      }
      await tx.voucher.update({
        where: { id: voucherId },
        data: { usedCount: { increment: 1 } },
      });
    });
  } catch (err) {
    // Don't fail the order if voucher tracking fails
    console.error("[checkout] markVoucherUsed error:", err);
  }
}

export async function POST(request: Request) {
  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    // ── 2. Validate ────────────────────────────────────────────────────────
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // ── 3. Get user session (null for guest) ───────────────────────────────
    const session = await getSession();
    const userId = session.isLoggedIn && session.userId ? session.userId : null;

    // ── 4. Resolve voucher discount (lightweight — product price needed) ───
    // Fetch product price to compute discount accurately
    let baseAmount = 0;
    if (parsed.data.voucherCode) {
      const prod = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
      if (prod) baseAmount = Number(prod.sellingPrice ?? 0);
    }
    const { discountAmount, voucherId } = await resolveVoucherDiscount(
      parsed.data.voucherCode,
      baseAmount,
      userId
    );

    if (parsed.data.paymentMethod === "PAYMENT_GATEWAY" && !(await isPoppayConfigured())) {
      return NextResponse.json(
        {
          success: false,
          error: "Poppay belum terkonfigurasi lengkap. Isi URL/API base, version, integrator token, aggregator code, dan merchant account number di Admin Settings.",
        },
        { status: 400 }
      );
    }

    // ── 5. Buat Poppay adapter ─────────────────────────────────────────────
    const paymentGateway = new PoppayAdapter();

    // ── 6. Call service ────────────────────────────────────────────────────
    const checkoutService = new CreateCheckoutService(
      new OrderRepository(),
      paymentGateway,
    );

    const result = await checkoutService.execute({
      ...parsed.data,
      userId,
      voucherCode: discountAmount > 0 ? parsed.data.voucherCode : undefined,
      voucherDiscount: discountAmount,
    });

    // ── 7. Mark voucher as used (fire-and-forget, non-blocking) ───────────
    if (voucherId) {
      markVoucherUsed(voucherId, userId, result.orderCode);
    }

    return NextResponse.json(
      { success: true, data: result, mode: "poppay" },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof ValidationError || err instanceof GuestWalletError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 404 });
    }
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 422 });
    }

    console.error("[POST /api/checkout]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
