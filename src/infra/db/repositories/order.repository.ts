import { prisma } from "@/src/infra/db/prisma";
import { Prisma } from "@prisma/client";
import { OrderStatus, InvoiceStatus } from "@/src/core/domain/enums/order.enum";

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  orderCode: string;
  userId?: string;
  productId: string;
  sellerId?: string;
  sellerProductId?: string;
  provider: string;       // DIGIFLAZZ | VIP_RESELLER
  targetNumber: string;
  targetData?: Prisma.InputJsonValue;
  whatsapp?: string;
  basePrice: number;
  markup: number;
  fee: number;
  discount?: number;       // Voucher discount applied
  voucherCode?: string;   // Voucher code used
  amount: number;
  sellerGrossProfit?: number;
  sellerFeeAmount?: number;
  sellerCommission?: number;
  status: OrderStatus;
  paymentMethod: string;
  viewTokenHash?: string; // guest only — raw token never stored
}

export interface CreateInvoiceInput {
  orderId: string;
  gatewayName: string;
  invoiceId: string;
  amount: number;
  fee: number;
  totalPayment: number;
  method?: string;
  paymentNumber?: string;
  paymentUrl?: string;
  expiredAt?: Date;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class OrderRepository {
  // ── Order CRUD ──────────────────────────────────────────────────────────

  async create(input: CreateOrderInput) {
    return prisma.order.create({
      data: {
        orderCode: input.orderCode,
        userId: input.userId ?? null,
        productId: input.productId,
        sellerId: input.sellerId ?? null,
        sellerProductId: input.sellerProductId ?? null,
        provider: input.provider,
        targetNumber: input.targetNumber,
        targetData: input.targetData ?? undefined,
        whatsapp: input.whatsapp ?? null,
        basePrice: input.basePrice,
        markup: input.markup,
        fee: input.fee,
        discount: input.discount ?? 0,
        voucherCode: input.voucherCode ?? null,
        amount: input.amount,
        sellerGrossProfit: input.sellerGrossProfit ?? 0,
        sellerFeeAmount: input.sellerFeeAmount ?? 0,
        sellerCommission: input.sellerCommission ?? 0,
        status: input.status,
        paymentMethod: input.paymentMethod,
        viewTokenHash: input.viewTokenHash ?? null,
      },
      include: { product: true, seller: true, sellerProduct: true },
    });
  }

  async findByCode(orderCode: string) {
    return prisma.order.findUnique({
      where: { orderCode },
      include: { product: true, paymentInvoice: true, user: true, seller: true, sellerProduct: true },
    });
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { product: true, paymentInvoice: true, user: true, seller: true, sellerProduct: true },
    });
  }

  async findByProviderRef(providerRef: string) {
    return prisma.order.findFirst({
      where: { providerRef },
      include: { product: true, paymentInvoice: true, user: true, seller: true, sellerProduct: true },
    });
  }

  async findByViewTokenHash(hash: string) {
    return prisma.order.findUnique({
      where: { viewTokenHash: hash },
      include: { product: true, paymentInvoice: true, seller: true, sellerProduct: true },
    });
  }

  /**
   * Atomic claim: transitions order from PAID → PROCESSING_PROVIDER.
   * Uses updateMany with WHERE status check so only ONE caller wins the race.
   * Returns true if this caller successfully claimed the order.
   */
  async claimForProcessing(orderId: string): Promise<boolean> {
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: [OrderStatus.PAID, OrderStatus.CREATED] },
      },
      data: { status: OrderStatus.PROCESSING_PROVIDER },
    });
    return result.count > 0;
  }

  async updateStatus(orderId: string, status: OrderStatus, extra?: {
    serialNumber?: string;
    providerRef?: string;
    notes?: string;
  }) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(extra?.serialNumber !== undefined && { serialNumber: extra.serialNumber }),
        ...(extra?.providerRef !== undefined && { providerRef: extra.providerRef }),
        ...(extra?.notes !== undefined && { notes: extra.notes }),
      },
    });
  }

  // ── Payment Invoice ──────────────────────────────────────────────────────

  async createInvoice(input: CreateInvoiceInput) {
    return prisma.paymentInvoice.create({
      data: {
        orderId: input.orderId,
        gatewayName: input.gatewayName,
        invoiceId: input.invoiceId,
        amount: input.amount,
        fee: input.fee,
        totalPayment: input.totalPayment,
        method: input.method ?? null,
        paymentNumber: input.paymentNumber ?? null,
        paymentUrl: input.paymentUrl ?? null,
        status: InvoiceStatus.PENDING,
        expiredAt: input.expiredAt ?? null,
      },
    });
  }

  async findInvoiceByInvoiceId(invoiceId: string) {
    return prisma.paymentInvoice.findUnique({ where: { invoiceId } });
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus,
    extra?: { paidAt?: Date; rawPayload?: Prisma.InputJsonValue | typeof Prisma.JsonNull }
  ) {
    return prisma.paymentInvoice.update({
      where: { invoiceId },
      data: {
        status,
        ...(extra?.paidAt && { paidAt: extra.paidAt }),
        ...(extra?.rawPayload !== undefined && { rawPayload: extra.rawPayload }),
      },
    });
  }

  // ── Webhook Idempotency ──────────────────────────────────────────────────

  /** Returns existing event if already processed; creates new record if not */
  async findOrCreateWebhookEvent(data: {
    source: string;
    eventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
  }) {
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: data.eventId },
    });
    if (existing) return { event: existing, duplicate: true };

    const event = await prisma.webhookEvent.create({
      data: {
        source: data.source,
        eventId: data.eventId,
        eventType: data.eventType,
        payload: data.payload,
        processed: false,
      },
    });
    return { event, duplicate: false };
  }

  async markWebhookProcessed(eventId: string, error?: string) {
    return prisma.webhookEvent.update({
      where: { eventId },
      data: {
        processed: !error,
        processedAt: new Date(),
        errorMessage: error ?? null,
      },
    });
  }

  // ── Provider Logs ────────────────────────────────────────────────────────

  async logProviderAction(data: {
    orderId: string;
    provider: string;
    action: string;
    request?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    response?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    success: boolean;
    errorMessage?: string;
  }) {
    try {
      return await prisma.orderProviderLog.create({
        data: {
          orderId: data.orderId,
          provider: data.provider,
          action: data.action,
          request: data.request ?? undefined,
          response: data.response ?? undefined,
          success: data.success,
          errorMessage: data.errorMessage ?? null,
        },
      });
    } catch (err) {
      // Logging failure must not break the flow
      console.error("[OrderRepository] Failed to log provider action:", err);
    }
  }

  // ── Wallet ───────────────────────────────────────────────────────────────

  async getWalletByUserId(userId: string) {
    return prisma.wallet.findUnique({ where: { userId } });
  }

  /**
   * Atomic HOLD: check & lock balance, create ledger entry, update wallet.balance
   * Returns null if insufficient balance.
   */
  async holdWalletBalance(userId: string, amount: number, orderId: string) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new Error("Wallet not found");
      if (Number(wallet.balance) < amount) return null;

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore - amount;

      await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "HOLD",
          amount,
          balanceBefore,
          balanceAfter,
          reference: orderId,
          description: `HOLD for order ${orderId}`,
        },
      });

      return wallet;
    });
  }

  /** Finalize debit (after SUCCESS) — balance already reduced by HOLD; just record ledger */
  async finalizeDebitLedger(userId: string, amount: number, orderId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return;
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount,
        balanceBefore: Number(wallet.balance),
        balanceAfter: Number(wallet.balance),
        reference: orderId,
        description: `DEBIT finalized for order ${orderId}`,
      },
    });
  }

  /** Release hold (after FAILED) — restore balance, record ledger */
  async releaseWalletHold(userId: string, amount: number, orderId: string) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) return;

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      await tx.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "RELEASE",
          amount,
          balanceBefore,
          balanceAfter,
          reference: orderId,
          description: `HOLD released for order ${orderId}`,
        },
      });
    });
  }

  /** Refund paid gateway order back to member wallet; idempotent per orderId */
  async refundPaidOrderToWallet(userId: string, amount: number, orderId: string) {
    return prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, balance: 0 },
        });
      }

      const existingRefund = await tx.ledgerEntry.findFirst({
        where: {
          walletId: wallet.id,
          type: "REFUND",
          reference: orderId,
        },
        select: { id: true },
      });

      if (existingRefund) {
        return { duplicated: true, balanceAfter: Number(wallet.balance) };
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "REFUND",
          amount,
          balanceBefore,
          balanceAfter,
          reference: orderId,
          description: `Refund order ${orderId} setelah provider gagal`,
        },
      });

      return { duplicated: false, balanceAfter };
    });
  }

  async creditSellerCommission(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderCode: true,
          sellerId: true,
          sellerCommission: true,
          sellerCommissionCreditedAt: true,
        },
      });

      if (!order || !order.sellerId) return null;

      const commissionAmount = Number(order.sellerCommission ?? 0);
      if (commissionAmount <= 0) return null;
      if (order.sellerCommissionCreditedAt) return null;

      let wallet = await tx.wallet.findUnique({ where: { userId: order.sellerId } });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId: order.sellerId, balance: 0 },
        });
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + commissionAmount;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "COMMISSION",
          amount: commissionAmount,
          balanceBefore,
          balanceAfter,
          reference: order.id,
          description: `Komisi seller untuk order ${order.orderCode}`,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { sellerCommissionCreditedAt: new Date() },
      });

      return {
        sellerId: order.sellerId,
        commissionAmount,
        balanceBefore,
        balanceAfter,
      };
    });
  }

  // ── Admin & reconcile helpers ────────────────────────────────────────────

  /** Get orders stuck in PROCESSING_PROVIDER or PAID for reconciliation */
  async findPendingProviderOrders(olderThanMinutes = 5) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PROCESSING_PROVIDER, OrderStatus.PAID] },
        updatedAt: { lt: cutoff },
      },
      include: { product: true },
    });
  }
}
