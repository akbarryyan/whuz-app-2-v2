import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { getSiteName } from "@/lib/site-config";
import { sendWhatsAppMessage } from "@/lib/fonnte";
import { sendGenericEmail } from "@/lib/mailer";
import { prisma } from "@/src/infra/db/prisma";
import { OrderStatus } from "@/src/core/domain/enums/order.enum";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";

export interface DigitalCredential {
  id: string;
  label: string | null;
  credentialEmail: string | null;
  credentialPassword: string | null;
  credentialData: Prisma.JsonValue | null;
  notes: string | null;
}

interface OrderForFulfillment {
  id: string;
  orderCode: string;
  whatsapp: string | null;
  targetData: Prisma.JsonValue | null;
  amount: Prisma.Decimal | number;
  paymentMethod: string;
  userId: string | null;
  user: {
    email: string | null;
  } | null;
  product: {
    id: string;
    name: string;
    type: string;
    provider: string;
  };
}

export class OrderFulfillmentService {
  constructor(private readonly orderRepo = new OrderRepository()) {}

  async fulfillSuccessfulOrder(orderId: string, options?: { serialNumber?: string | null; providerRef?: string | null }) {
    const order = await this.findOrder(orderId);
    if (!order) return;

    if (order.product.provider === "MANUAL" && isDigitalStockProduct(order.product.type)) {
      const credential = await this.assignDigitalStock(order);
      if (!credential) {
        await this.orderRepo.updateStatus(order.id, OrderStatus.PROCESSING_PROVIDER, {
          notes: "Stok digital habis. Admin perlu tambah stok atau proses manual.",
        });
        return;
      }

      await this.orderRepo.updateStatus(order.id, OrderStatus.SUCCESS, {
        serialNumber: buildDigitalSerialNumber(credential),
        providerRef: `DIGITAL-STOCK-${credential.id}`,
        notes: "Produk digital otomatis dikirim setelah pembayaran sukses.",
      });
      await this.afterSuccess(order, credential);
      return;
    }

    await this.orderRepo.updateStatus(order.id, OrderStatus.SUCCESS, {
      serialNumber: options?.serialNumber ?? undefined,
      providerRef: options?.providerRef ?? undefined,
    });
    await this.afterSuccess(order, null);
  }

  async notifySuccess(orderId: string) {
    const order = await this.findOrder(orderId);
    if (!order) return;
    const credential = await getDigitalCredentialByOrder(orderId);
    await this.sendSuccessWhatsApp(order, credential);
    await this.sendSuccessEmail(order, credential);
  }

  private async findOrder(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderCode: true,
        whatsapp: true,
        targetData: true,
        amount: true,
        paymentMethod: true,
        userId: true,
        user: { select: { email: true } },
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            provider: true,
          },
        },
      },
    });
  }

  private async assignDigitalStock(order: OrderForFulfillment): Promise<DigitalCredential | null> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<DigitalCredential[]>`
        SELECT id, label, credentialEmail, credentialPassword, credentialData, notes
        FROM digital_product_stocks
        WHERE orderId = ${order.id}
        LIMIT 1
      `;
      if (existing[0]) return existing[0];

      const available = await tx.$queryRaw<DigitalCredential[]>`
        SELECT id, label, credentialEmail, credentialPassword, credentialData, notes
        FROM digital_product_stocks
        WHERE productId = ${order.product.id}
          AND status = 'AVAILABLE'
        ORDER BY createdAt ASC
        LIMIT 1
        FOR UPDATE
      `;
      const stock = available[0];
      if (!stock) return null;

      await tx.$executeRaw`
        UPDATE digital_product_stocks
        SET status = 'SOLD',
            orderId = ${order.id},
            soldAt = NOW(3),
            updatedAt = NOW(3)
        WHERE id = ${stock.id}
          AND status = 'AVAILABLE'
      `;

      const remaining = await tx.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*) AS total
        FROM digital_product_stocks
        WHERE productId = ${order.product.id}
          AND status = 'AVAILABLE'
      `;
      if (Number(remaining[0]?.total ?? 0) === 0) {
        await tx.product.update({
          where: { id: order.product.id },
          data: { stock: false },
        });
      }

      return stock;
    });
  }

  private async afterSuccess(order: OrderForFulfillment, credential: DigitalCredential | null) {
    await this.orderRepo.creditSellerCommission(order.id);

    if (order.paymentMethod === "WALLET" && order.userId) {
      await this.orderRepo.finalizeDebitLedger(order.userId, Number(order.amount), order.id);
    }

    await this.sendSuccessWhatsApp(order, credential);
    await this.sendSuccessEmail(order, credential);
  }

  private async sendSuccessWhatsApp(order: OrderForFulfillment, credential: DigitalCredential | null) {
    if (!order.whatsapp) return;

    const message = await buildSuccessMessage(order, credential);
    const notificationId = crypto.randomUUID();

    const inserted = await prisma.$executeRaw`
      INSERT IGNORE INTO order_notifications (id, orderId, channel, type, status, target, message, createdAt, updatedAt)
      VALUES (${notificationId}, ${order.id}, 'WHATSAPP', 'PURCHASE_SUCCESS', 'SKIPPED', ${order.whatsapp}, ${message}, NOW(3), NOW(3))
    `;

    if (Number(inserted) === 0) return;

    const result = await sendWhatsAppMessage(order.whatsapp, message);
    await prisma.$executeRaw`
      UPDATE order_notifications
      SET status = ${result.success ? "SENT" : "FAILED"},
          error = ${result.success ? null : result.detail ?? "Gagal mengirim WhatsApp"},
          sentAt = ${result.success ? new Date() : null},
          updatedAt = NOW(3)
      WHERE id = ${notificationId}
    `;
  }

  private async sendSuccessEmail(order: OrderForFulfillment, credential: DigitalCredential | null) {
    const targetEmail = resolveBuyerEmail(order);
    if (!targetEmail) return;

    const message = await buildSuccessMessage(order, credential);
    const notificationId = crypto.randomUUID();

    const inserted = await prisma.$executeRaw`
      INSERT IGNORE INTO order_notifications (id, orderId, channel, type, status, target, message, createdAt, updatedAt)
      VALUES (${notificationId}, ${order.id}, 'EMAIL', 'PURCHASE_SUCCESS', 'SKIPPED', ${targetEmail}, ${message}, NOW(3), NOW(3))
    `;

    if (Number(inserted) === 0) return;

    const siteName = await getSiteName();
    const result = await sendGenericEmail({
      toEmail: targetEmail,
      subject: `[${siteName}] Pembelian berhasil - ${order.orderCode}`,
      text: message.replace(/\*/g, ""),
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message.replace(/\*/g, ""))}</pre>`,
    });

    await prisma.$executeRaw`
      UPDATE order_notifications
      SET status = ${result.success ? "SENT" : "FAILED"},
          error = ${result.success ? null : result.detail ?? "Gagal mengirim email"},
          sentAt = ${result.success ? new Date() : null},
          updatedAt = NOW(3)
      WHERE id = ${notificationId}
    `;
  }
}

export async function getDigitalCredentialByOrder(orderId: string): Promise<DigitalCredential | null> {
  const rows = await prisma.$queryRaw<DigitalCredential[]>`
    SELECT id, label, credentialEmail, credentialPassword, credentialData, notes
    FROM digital_product_stocks
    WHERE orderId = ${orderId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export function isDigitalStockProduct(type?: string | null) {
  return String(type ?? "").toLowerCase() === "digital_stock";
}

function buildDigitalSerialNumber(credential: DigitalCredential) {
  return credential.label || credential.credentialEmail || `DIGITAL-${credential.id.slice(0, 8)}`;
}

async function buildSuccessMessage(order: OrderForFulfillment, credential: DigitalCredential | null) {
  const siteName = await getSiteName();
  const lines = [
    `*[${siteName}]* Pembelian berhasil`,
    "",
    `Order: *${order.orderCode}*`,
    `Produk: *${order.product.name}*`,
    `Total: *${formatCurrency(Number(order.amount))}*`,
  ];

  if (credential) {
    lines.push(
      "",
      "*Detail akun digital:*",
      ...(credential.label ? [`Label: ${credential.label}`] : []),
      ...(credential.credentialEmail ? [`Email: ${credential.credentialEmail}`] : []),
      ...(credential.credentialPassword ? [`Password: ${credential.credentialPassword}`] : []),
      ...(credential.notes ? [`Catatan: ${credential.notes}`] : []),
    );
  }

  lines.push("", "Simpan data ini baik-baik. Terima kasih.");
  return lines.join("\n");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function resolveBuyerEmail(order: OrderForFulfillment) {
  if (order.user?.email) return order.user.email;
  const targetData = order.targetData;
  if (!targetData || typeof targetData !== "object" || Array.isArray(targetData)) return null;
  const value = (targetData as Record<string, unknown>).email;
  return typeof value === "string" && value.includes("@") ? value.trim() : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
