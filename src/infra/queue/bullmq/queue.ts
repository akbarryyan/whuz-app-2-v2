import { Queue, ConnectionOptions } from "bullmq";
import { QUEUE_NAME, JobData, JobName } from "./jobs";
import { IQueuePort } from "@/src/core/ports/queue.port";

const connection: ConnectionOptions = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

// Singleton queue instance (safe for Next.js edge/serverless with hot reload)
const globalForQueue = globalThis as unknown as { transactionQueue?: Queue<JobData, void, JobName> };

export const transactionQueue: Queue<JobData, void, JobName> =
  globalForQueue.transactionQueue ??
  new Queue<JobData, void, JobName>(QUEUE_NAME, { connection });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.transactionQueue = transactionQueue;
}

/**
 * BullMQ implementation of IQueuePort
 */
export class BullMQQueueAdapter implements IQueuePort {
  async enqueueProviderPurchase(orderId: string, delayMs = 0): Promise<void> {
    await transactionQueue.add(
      "EXECUTE_PROVIDER_PURCHASE",
      { orderId },
      {
        delay: delayMs,
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
        jobId: `purchase__${orderId}`, // Idempotency: same orderId = deduplicated
      }
    );
  }

  async enqueueReconcile(orderId: string, delayMs = 60_000): Promise<void> {
    await transactionQueue.add(
      "RECONCILE_ORDER",
      { orderId },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: "fixed", delay: 30_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
        jobId: `reconcile__${orderId}__${Date.now()}`,
      }
    );
  }
}
