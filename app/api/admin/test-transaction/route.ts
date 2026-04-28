/**
 * POST /api/admin/test-transaction
 *
 * Runs a full transaction pipeline synchronously (no queue — inline provider call).
 * Returns step-by-step trace for debugging.
 *
 * This route forces admin authentication and never modifies provider mode.
 * Use GET/PATCH /api/admin/provider-mode first to set mock/real mode.
 */

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/src/infra/db/prisma";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { ProviderFactory } from "@/src/infra/providers/provider.factory";
import { PoppayAdapter } from "@/src/infra/payment/poppay/poppay.adapter";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";
import { OrderStatus } from "@/src/core/domain/enums/order.enum";

export const dynamic = "force-dynamic";

const Schema = z.object({
  productId: z.string().min(1),
  targetNumber: z.string().min(1),
  targetData: z.record(z.string(), z.unknown()).optional(),
  /** WALLET (default) or PAYMENT_GATEWAY (skips provider, only creates order+invoice) */
  paymentMethod: z.enum(["WALLET", "PAYMENT_GATEWAY"]).default("WALLET"),
  /** Metode PG saat ini QRIS-only. */
  pgMethod: z.string().optional(),
  /** userId opsional — jika tidak diisi, pakai user pertama di DB */
  userId: z.string().optional(),
});

type Step = {
  step: string;
  status: "ok" | "error" | "skip";
  durationMs: number;
  detail?: unknown;
};

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation error", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { productId, targetNumber, targetData, paymentMethod, pgMethod, userId: bodyUserId } = parsed.data;
  const normalizedTargetData = targetData as Prisma.InputJsonValue | undefined;
  const providerTargetData = targetData;

  // Tentukan user yang dipakai: dari body, lalu cari ADMIN, lalu fallback ke user pertama di DB
  let userId = bodyUserId;
  if (!userId) {
    const fallbackUser =
      (await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } })) ??
      (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
    if (!fallbackUser) {
      return NextResponse.json({ success: false, error: "Tidak ada user di database" }, { status: 500 });
    }
    userId = fallbackUser.id;
  }
  const steps: Step[] = [];
  let t = Date.now();

  // ── Helper ────────────────────────────────────────────────────────────────
  const addStep = (step: string, status: Step["status"], detail?: unknown) => {
    const durationMs = Date.now() - t;
    steps.push({ step, status, durationMs, detail });
    t = Date.now();
  };

  // ── 1. Fetch product ───────────────────────────────────────────────────────
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }
  if (!product.isActive) {
    return NextResponse.json({ success: false, error: "Product is inactive" }, { status: 400 });
  }
  addStep("fetch_product", "ok", {
    name: product.name,
    providerCode: product.providerCode,
    provider: product.provider,
    sellingPrice: Number(product.sellingPrice),
    mode: ProviderFactory.getProviderMode(product.provider as ProviderType),
  });

  // ── 2. Check wallet balance ────────────────────────────────────────────────
  const orderRepo = new OrderRepository();
  const amount = Number(product.providerPrice) + Number(product.margin);

  if (paymentMethod === "WALLET") {
    const wallet = await orderRepo.getWalletByUserId(userId);
    const balance = Number(wallet?.balance ?? 0);
    if (balance < amount) {
      addStep("check_balance", "error", { balance, required: amount });
      return NextResponse.json(
        { success: false, error: "Insufficient balance", steps },
        { status: 422 }
      );
    }
    addStep("check_balance", "ok", { balance, required: amount, after: balance - amount });
  } else {
    addStep("check_balance", "skip", { reason: "PAYMENT_GATEWAY mode" });
  }

  // ── 3. Create order ────────────────────────────────────────────────────────
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const orderCode = `TP-${yy}${mm}${dd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const order = await orderRepo.create({
    orderCode,
    userId,
    productId: product.id,
    provider: product.provider,
    targetNumber,
    targetData: normalizedTargetData,
    basePrice: Number(product.providerPrice),
    markup: Number(product.margin),
    fee: 0,
    amount,
    status: OrderStatus.CREATED,
    paymentMethod,
  });
  addStep("create_order", "ok", { orderCode, orderId: order.id, amount });

  // ── 4. Hold wallet ─────────────────────────────────────────────────────────
  if (paymentMethod === "WALLET") {
    const hold = await orderRepo.holdWalletBalance(userId, amount, order.id);
    if (!hold) {
      await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
        notes: "Balance race condition at hold time",
      });
      addStep("hold_wallet", "error", { reason: "Balance insufficient at hold time" });
      return NextResponse.json(
        { success: false, error: "Insufficient balance at hold", steps },
        { status: 422 }
      );
    }
    await orderRepo.updateStatus(order.id, OrderStatus.PAID);
    addStep("hold_wallet", "ok", { heldAmount: amount });
  }

  // ── 5. PAYMENT_GATEWAY path ─────────────────────────────────────────────────
  if (paymentMethod === "PAYMENT_GATEWAY") {
    // Update status order ke WAITING_PAYMENT terlebih dahulu
    await orderRepo.updateStatus(order.id, OrderStatus.WAITING_PAYMENT);

    // Panggil Poppay untuk buat invoice QRIS
    const poppay = new PoppayAdapter();
    let pgResult;
    try {
      pgResult = await poppay.createPayment({
        orderId: orderCode,
        amount,
        method: pgMethod ?? "qris",
        description: `${product.name} — ${targetNumber}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await orderRepo.updateStatus(order.id, OrderStatus.FAILED, { notes: message });
      addStep("create_invoice", "error", { error: message });
      return NextResponse.json(
        { success: false, error: `Poppay error: ${message}`, steps },
        { status: 502 }
      );
    }

    // Update fee dan simpan invoice
    await prisma.order.update({
      where: { id: order.id },
      data: { fee: pgResult.fee, amount: pgResult.totalPayment },
    });
    await orderRepo.createInvoice({
      orderId: order.id,
      gatewayName: "POPPAY",
      invoiceId: pgResult.invoiceId,
      amount: pgResult.amount,
      fee: pgResult.fee,
      totalPayment: pgResult.totalPayment,
      method: pgResult.method,
      paymentNumber: pgResult.paymentNumber,
      paymentUrl: pgResult.paymentUrl,
      expiredAt: pgResult.expiredAt,
    });

    addStep("create_invoice", "ok", {
      invoiceId: pgResult.invoiceId,
      paymentUrl: pgResult.paymentUrl,
      paymentNumber: pgResult.paymentNumber,
      method: pgResult.method,
      fee: pgResult.fee,
      totalPayment: pgResult.totalPayment,
    });

    return NextResponse.json({
      success: true,
      steps,
      result: {
        orderCode,
        status: OrderStatus.WAITING_PAYMENT,
        amount: pgResult.totalPayment,
        serialNumber: null,
        providerRef: pgResult.invoiceId,
        mode: "poppay",
        paymentUrl: pgResult.paymentUrl,
        paymentNumber: pgResult.paymentNumber,
      },
    });
  }

  await orderRepo.updateStatus(order.id, OrderStatus.PROCESSING_PROVIDER);
  addStep("mark_processing", "ok", {});

  // ── 6. Call provider ───────────────────────────────────────────────────────
  const providerType = product.provider as ProviderType;
  const provider = ProviderFactory.create(providerType);
  const effectiveMode = ProviderFactory.getProviderMode(providerType);

  const purchaseReq = {
    productCode: product.providerCode,
    target: targetNumber,
    additionalData: providerTargetData,
  };

  let providerResult;
  try {
    providerResult = await provider.purchase(purchaseReq);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    await orderRepo.updateStatus(order.id, OrderStatus.FAILED, { notes: message });
    await orderRepo.releaseWalletHold(userId, amount, order.id);
    addStep("provider_purchase", "error", { error: message, mode: effectiveMode });
    return NextResponse.json(
      { success: false, error: `Provider error: ${message}`, steps },
      { status: 502 }
    );
  }

  addStep("provider_purchase", providerResult.status === "failed" ? "error" : "ok", {
    status: providerResult.status,
    transactionId: providerResult.transactionId,
    serialNumber: providerResult.serialNumber,
    message: providerResult.message,
    mode: effectiveMode,
    rawResponse: providerResult.rawResponse,
  });

  // ── 7. Finalize order ──────────────────────────────────────────────────────
  if (providerResult.status === "success") {
    await orderRepo.updateStatus(order.id, OrderStatus.SUCCESS, {
      serialNumber: providerResult.serialNumber,
      providerRef: providerResult.transactionId,
    });
    await orderRepo.finalizeDebitLedger(userId, amount, order.id);
    addStep("finalize_order", "ok", { finalStatus: OrderStatus.SUCCESS });
  } else if (providerResult.status === "pending") {
    await orderRepo.updateStatus(order.id, OrderStatus.PROCESSING_PROVIDER, {
      providerRef: providerResult.transactionId,
    });
    addStep("finalize_order", "ok", {
      finalStatus: OrderStatus.PROCESSING_PROVIDER,
      note: "Still pending — reconcile must be scheduled in production",
    });
  } else {
    await orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
      notes: providerResult.message,
    });
    await orderRepo.releaseWalletHold(userId, amount, order.id);
    addStep("finalize_order", "error", { finalStatus: OrderStatus.FAILED });
  }

  return NextResponse.json({
    success: providerResult.status !== "failed",
    steps,
    result: {
      orderCode,
      status:
        providerResult.status === "success"
          ? OrderStatus.SUCCESS
          : providerResult.status === "pending"
          ? OrderStatus.PROCESSING_PROVIDER
          : OrderStatus.FAILED,
      amount,
      serialNumber: providerResult.serialNumber ?? null,
      providerRef: providerResult.transactionId,
      mode: effectiveMode,
    },
  });
}
