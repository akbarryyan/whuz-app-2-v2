/**
 * BullMQ Job type definitions
 *
 * EXECUTE_PROVIDER_PURCHASE — process provider purchase for a paid order
 * RECONCILE_ORDER           — check status of a pending/processing order
 */

export const QUEUE_NAME = "transactions";

export type JobName = "EXECUTE_PROVIDER_PURCHASE" | "RECONCILE_ORDER";

export interface ExecuteProviderPurchaseData {
  orderId: string;
}

export interface ReconcileOrderData {
  orderId: string;
}

export type JobData = ExecuteProviderPurchaseData | ReconcileOrderData;
