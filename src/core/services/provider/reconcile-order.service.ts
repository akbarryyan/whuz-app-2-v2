import { OrderRepository } from "@/src/infra/db/repositories/order.repository";
import { ExecuteProviderPurchaseService } from "./execute-provider-purchase.service";
import { ProviderFactory } from "@/src/infra/providers/provider.factory";
import { ProviderType } from "@/src/core/domain/enums/provider.enum";
import { OrderStatus } from "@/src/core/domain/enums/order.enum";
import { checkAndUpgradeUserTier } from "@/lib/pricing";

/**
 * ReconcileOrderService
 *
 * Dipanggil langsung (inline) oleh:
 *  - Admin "Reconcile" button via POST /api/admin/transactions/:id/reconcile
 *  - Admin "Reconcile All" via POST /api/admin/transactions/reconcile-all
 *  - (Opsional) cron job
 *
 * Tidak lagi menggunakan BullMQ queue.
 * Jika belum ada providerRef → panggil executeService.execute() langsung.
 * Jika sudah ada providerRef → checkStatus ke provider.
 */
export class ReconcileOrderService {
  private readonly executeService: ExecuteProviderPurchaseService;

  constructor(
    private readonly orderRepo: OrderRepository,
  ) {
    this.executeService = new ExecuteProviderPurchaseService(orderRepo);
  }

  private async handleProviderFailure(order: NonNullable<Awaited<ReturnType<OrderRepository["findById"]>>>, notes: string) {
    if (order.paymentMethod === "WALLET" && order.userId) {
      await this.orderRepo.updateStatus(order.id, OrderStatus.FAILED, { notes });
      await this.orderRepo.releaseWalletHold(order.userId, Number(order.amount), order.id);
      return { status: "failed", message: "Order gagal dan hold wallet dilepas" };
    }

    if (order.paymentMethod === "PAYMENT_GATEWAY" && order.userId) {
      await this.orderRepo.refundPaidOrderToWallet(order.userId, Number(order.amount), order.id);
      await this.orderRepo.updateStatus(order.id, OrderStatus.REFUNDED, {
        notes: `${notes} Dana otomatis dikembalikan ke saldo akun.`,
      });
      return { status: "refunded", message: "Order gagal dan dana dikembalikan ke wallet member" };
    }

    await this.orderRepo.updateStatus(order.id, OrderStatus.FAILED, {
      notes: `${notes} Pembayaran sudah diterima. Hubungi CS untuk proses refund manual.`,
    });
    return { status: "manual_refund", message: "Order guest gagal dan perlu refund manual via CS" };
  }

  async reconcile(orderId: string): Promise<{ status: string; message: string }> {
    const order = await this.orderRepo.findById(orderId);

    if (!order) {
      return { status: "error", message: `Order ${orderId} not found` };
    }

    // Only reconcile orders that are still in flight
    if (
      order.status !== OrderStatus.PROCESSING_PROVIDER &&
      order.status !== OrderStatus.PAID
    ) {
      return { status: "skip", message: `Order already in terminal state: ${order.status}` };
    }

    const providerType = (order.provider ?? "DIGIFLAZZ") as ProviderType;
    const provider = ProviderFactory.create(providerType);

    // The provider port's checkStatus method doesn't exist in current port definition.
    // We re-use purchase() in idempotent fashion only if providerRef is missing.
    // For mock/real providers that support status check, call provider.purchase
    // with idempotency (provider won't double-charge if ref exists).

    // If no providerRef yet → jalankan execute langsung (bukan enqueue)
    if (!order.providerRef) {
      await this.executeService.execute(orderId);
      return { status: "re-executed", message: "No providerRef — execute dipanggil langsung" };
    }

    // Log reconcile attempt
    await this.orderRepo.logProviderAction({
      orderId,
      provider: providerType,
      action: "reconcile:checkStatus",
      request: { providerRef: order.providerRef },
      success: true,
    });

    // Call provider.checkStatus — no re-purchase, read-only status query
    let checkResult;
    try {
      checkResult = await provider.checkStatus(order.providerRef);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Reconcile] checkStatus failed for order ${orderId}:`, message);
      return { status: "error", message: `checkStatus error: ${message}. Coba lagi nanti.` };
    }

    await this.orderRepo.logProviderAction({
      orderId,
      provider: providerType,
      action: "reconcile:response",
      response: checkResult.rawResponse,
      success: checkResult.success,
    });

    if (checkResult.status === "success") {
      await this.orderRepo.updateStatus(orderId, OrderStatus.SUCCESS, {
        serialNumber: checkResult.serialNumber,
        providerRef: checkResult.transactionId,
      });

      await this.orderRepo.creditSellerCommission(orderId);

      if (order.paymentMethod === "WALLET" && order.userId) {
        await this.orderRepo.finalizeDebitLedger(order.userId, Number(order.amount), orderId);
      }

      // Auto-upgrade tier based on accumulated success orders
      if (order.userId) {
        await checkAndUpgradeUserTier(order.userId);
      }

      console.log(`[Reconcile] Order ${orderId} → SUCCESS. SN: ${checkResult.serialNumber}`);
      return { status: "success", message: "Order reconciled to SUCCESS" };

    } else if (checkResult.status === "failed") {
      const failure = await this.handleProviderFailure(
        order,
        `Reconcile: provider FAILED — ${checkResult.message}`
      );

      console.log(`[Reconcile] Order ${orderId} → FAILED.`);
      return failure;

    } else {
      // Masih pending — admin bisa coba reconcile lagi nanti
      console.log(`[Reconcile] Order ${orderId} still PENDING.`);
      return { status: "pending", message: "Masih pending — coba reconcile lagi nanti" };
    }
  }

  /** Bulk reconcile all stale orders (called by admin or cron) */
  async reconcileStaleOrders(): Promise<{ processed: number; errors: number }> {
    const staleOrders = await this.orderRepo.findPendingProviderOrders(5);

    let processed = 0;
    let errors = 0;

    for (const order of staleOrders) {
      try {
        await this.reconcile(order.id);
        processed++;
      } catch (err) {
        console.error(`[Reconcile] Failed for order ${order.id}:`, err);
        errors++;
      }
    }

    return { processed, errors };
  }
}
