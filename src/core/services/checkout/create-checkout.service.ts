import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/src/infra/db/prisma";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { IPaymentGatewayPort } from "@/src/core/ports/payment-gateway.port";
import { ExecuteProviderPurchaseService } from "@/src/core/services/provider/execute-provider-purchase.service";
import { OrderStatus, PaymentMethod } from "@/src/core/domain/enums/order.enum";
import {
  ValidationError,
  NotFoundError,
  GuestWalletError,
  InsufficientBalanceError,
} from "@/src/core/domain/errors/domain.errors";
import { getPriceForUser } from "@/lib/pricing";

export interface CheckoutInput {
  productId: string;
  sellerProductId?: string;
  targetNumber: string;            // phone / game ID / etc.
  targetData?: Prisma.InputJsonValue; // zone, server, etc.
  whatsapp?: string;                // customer WhatsApp for notification
  paymentMethod: "WALLET" | "PAYMENT_GATEWAY";
  paymentGatewayMethod?: string;   // QRIS, VA_BCA, etc. (PG only)
  redirectUrl?: string;            // PG redirect after payment
  /** Authenticated user id — null for guest */
  userId?: string | null;
  /** Voucher code entered by user (validated in route handler) */
  voucherCode?: string;
  /** Pre-calculated discount amount (validated in route handler) */
  voucherDiscount?: number;
}

export interface CheckoutResult {
  orderCode: string;
  status: string;
  amount: number;
  paymentUrl?: string;
  /** Only returned for guest (never stored in DB) */
  viewToken?: string;
  invoiceId?: string;
}

/**
 * CreateCheckoutService
 *
 * Rules:
 * - Guest can only use PAYMENT_GATEWAY.
 * - Wallet: execute provider LANGSUNG (inline) setelah hold balance.
 * - Payment Gateway: tunggu webhook PAID, baru execute provider.
 * - Pricing snapshot (basePrice, markup, fee, amount) frozen at creation time.
 */
export class CreateCheckoutService {
  private readonly executeService: ExecuteProviderPurchaseService;

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: IPaymentGatewayPort,
  ) {
    this.executeService = new ExecuteProviderPurchaseService(orderRepo);
  }

  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    // ── 1. Validate input ──────────────────────────────────────────────────
    if (!input.productId) throw new ValidationError("productId is required");
    if (!input.targetNumber) throw new ValidationError("targetNumber is required");
    if (!["WALLET", "PAYMENT_GATEWAY"].includes(input.paymentMethod)) {
      throw new ValidationError("Invalid paymentMethod");
    }

    // Guest cannot use wallet
    if (!input.userId && input.paymentMethod === "WALLET") {
      throw new GuestWalletError();
    }

    // ── 2. Fetch & validate product ────────────────────────────────────────
    const sellerProduct = input.sellerProductId
      ? await prisma.sellerProduct.findUnique({
          where: { id: input.sellerProductId },
          include: {
            seller: {
              select: {
                id: true,
                sellerProfile: {
                  select: { id: true, isActive: true },
                },
              },
            },
            product: true,
          },
        })
      : null;

    if (input.sellerProductId && !sellerProduct) {
      throw new NotFoundError("Seller product");
    }
    if (sellerProduct && (!sellerProduct.isActive || !sellerProduct.seller.sellerProfile?.isActive)) {
      throw new ValidationError("Seller product is not active");
    }
    if (sellerProduct && sellerProduct.productId !== input.productId) {
      throw new ValidationError("Seller product does not match selected product");
    }

    const product = sellerProduct?.product ?? await prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product) throw new NotFoundError("Product");
    if (!product.isActive) throw new ValidationError("Product is not active");
    if (!product.stock) throw new ValidationError("Product is out of stock");

    // ── 3. Compute pricing snapshot (tier-aware) ──────────────────────────
    const tierPricing = sellerProduct ? null : await getPriceForUser(input.userId, product);
    const basePrice = tierPricing?.basePrice ?? Number(product.providerPrice);
    const configuredSellingPrice = sellerProduct?.sellingPrice !== null && sellerProduct?.sellingPrice !== undefined
      ? Number(sellerProduct.sellingPrice)
      : Number(product.sellingPrice);
    const markup = sellerProduct
      ? Math.max(0, configuredSellingPrice - basePrice)
      : (tierPricing?.markup ?? Number(product.margin));
    const fee = 0; // Gateway fee added after we know method — update after PG call
    const discount = Math.min(input.voucherDiscount ?? 0, basePrice + markup - 1); // Can't discount to below 1
    const amount = Math.max(1, basePrice + markup - discount); // Customer pays after voucher discount
    const sellerGrossProfit = sellerProduct ? Math.max(0, markup - discount) : 0;
    const sellerFeeAmount = sellerProduct
      ? this.calculateMerchantFee({
          feeType: sellerProduct.feeType,
          feeValue: Number(sellerProduct.feeValue),
          grossProfit: sellerGrossProfit,
        })
      : 0;
    const sellerCommission = sellerProduct
      ? Math.max(
          0,
          this.calculateSellerCommission({
            commissionType: sellerProduct.commissionType,
            commissionValue: Number(sellerProduct.commissionValue),
            realizedMarkup: sellerGrossProfit,
          }) - sellerFeeAmount
        )
      : 0;

    // ── 4. Generate order code ─────────────────────────────────────────────
    const orderCode = this.generateOrderCode();

    // ── 5. Guest token ─────────────────────────────────────────────────────
    let viewToken: string | undefined;
    let viewTokenHash: string | undefined;

    if (!input.userId) {
      viewToken = crypto.randomBytes(32).toString("hex");
      viewTokenHash = crypto.createHash("sha256").update(viewToken).digest("hex");
    }

    // ── 6. Wallet quick-read balance check (before order creation) ─────────
    if (input.paymentMethod === PaymentMethod.WALLET) {
      const wallet = await this.orderRepo.getWalletByUserId(input.userId!);
      if (!wallet || Number(wallet.balance) < amount) {
        throw new InsufficientBalanceError();
      }
    }

    // ── 7. Create order ────────────────────────────────────────────────────
    const order = await this.orderRepo.create({
      orderCode,
      userId: input.userId ?? undefined,
      productId: product.id,
      sellerId: sellerProduct?.sellerId,
      sellerProductId: sellerProduct?.id,
      provider: product.provider,
      targetNumber: input.targetNumber,
      targetData: input.targetData,
      whatsapp: input.whatsapp,
      basePrice,
      markup,
      fee,
      discount,
      voucherCode: input.voucherCode,
      amount,
      sellerGrossProfit,
      sellerFeeAmount,
      sellerCommission,
      status:
        input.paymentMethod === PaymentMethod.WALLET
          ? OrderStatus.CREATED
          : OrderStatus.WAITING_PAYMENT,
      paymentMethod: input.paymentMethod,
      viewTokenHash,
    });

    // ── 8. Wallet: actual HOLD + enqueue ────────────────────────────────────
    if (input.paymentMethod === PaymentMethod.WALLET) {
      const holdResult = await this.orderRepo.holdWalletBalance(
        input.userId!,
        amount,
        order.id
      );

      if (holdResult === null) {
        // Race condition — release and fail
        await this.orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
          notes: "Insufficient balance at hold time",
        });
        throw new InsufficientBalanceError();
      }

      // Wallet orders: mark PAID lalu execute provider langsung
      await this.orderRepo.updateStatus(order.id, OrderStatus.PAID);

      // Execute provider langsung (inline) — idempotent via atomic claim
      try {
        await this.executeService.execute(order.id);
      } catch (execErr: unknown) {
        // Execute gagal tapi order sudah PAID — admin bisa reconcile
        const message = execErr instanceof Error ? execErr.message : "Unknown error";
        console.error(`[Checkout] Wallet order ${order.id} execute gagal:`, message);
      }

      // Re-fetch order untuk return status terbaru
      const updatedOrder = await this.orderRepo.findById(order.id);

      return {
        orderCode,
        status: updatedOrder?.status ?? OrderStatus.PAID,
        amount,
        viewToken,
      };
    }

    // ── 9. Payment Gateway path ────────────────────────────────────────────
    let pgResult;
    try {
      const payer = input.userId
        ? await prisma.user.findUnique({
            where: { id: input.userId },
            select: { name: true, email: true, phone: true },
          })
        : null;

      pgResult = await this.paymentGateway.createPayment({
        orderId: orderCode,
        amount,
        method: input.paymentGatewayMethod,
        redirectUrl: input.redirectUrl,
        description: `${product.name} — ${input.targetNumber}`,
        payerName:
          payer?.name?.trim() ||
          input.whatsapp?.trim() ||
          input.targetNumber,
        payerEmail: payer?.email?.trim() || undefined,
      });

      // Update order fee with actual gateway fee
      const totalWithFee = pgResult.amount + pgResult.fee;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          fee: pgResult.fee,
          amount: totalWithFee,
        },
      });

      // Create payment invoice
      await this.orderRepo.createInvoice({
        orderId: order.id,
        gatewayName: this.paymentGateway.gatewayName,
        invoiceId: pgResult.invoiceId,
        amount: pgResult.amount,
        fee: pgResult.fee,
        totalPayment: pgResult.totalPayment,
        method: pgResult.method,
        paymentNumber: pgResult.paymentNumber,
        paymentUrl: pgResult.paymentUrl,
        expiredAt: pgResult.expiredAt,
      });

      return {
        orderCode,
        status: OrderStatus.WAITING_PAYMENT,
        amount: totalWithFee,
        paymentUrl: pgResult.paymentUrl,
        viewToken,
        invoiceId: pgResult.invoiceId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat invoice pembayaran.";

      await this.orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
        notes: `Gateway init error: ${message}`,
      });

      throw new ValidationError(message);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private generateOrderCode(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `WP-${yy}${mm}${dd}-${rand}`;
  }

  private calculateSellerCommission(input: {
    commissionType: string;
    commissionValue: number;
    realizedMarkup: number;
  }): number {
    if (input.realizedMarkup <= 0 || input.commissionValue <= 0) return 0;

    const rawCommission = input.commissionType === "FIXED"
      ? input.commissionValue
      : Math.floor((input.realizedMarkup * input.commissionValue) / 100);

    return Math.max(0, Math.min(rawCommission, input.realizedMarkup));
  }

  private calculateMerchantFee(input: {
    feeType: string;
    feeValue: number;
    grossProfit: number;
  }): number {
    if (input.grossProfit <= 0 || input.feeValue <= 0) return 0;

    const rawFee = input.feeType === "FIXED"
      ? input.feeValue
      : Math.floor((input.grossProfit * input.feeValue) / 100);

    return Math.max(0, Math.min(rawFee, input.grossProfit));
  }
}
