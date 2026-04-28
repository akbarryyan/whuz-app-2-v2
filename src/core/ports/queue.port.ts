export interface IQueuePort {
  /**
   * Enqueue a provider purchase job for an order
   */
  enqueueProviderPurchase(orderId: string, delayMs?: number): Promise<void>;

  /**
   * Enqueue a reconcile check job for an order
   */
  enqueueReconcile(orderId: string, delayMs?: number): Promise<void>;
}
