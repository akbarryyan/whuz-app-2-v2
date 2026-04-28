/**
 * BullMQ Worker — Transaction Queue
 *
 * Run separately from Next.js:
 *   npx tsx src/infra/queue/bullmq/worker.ts
 *
 * Or add to package.json scripts:
 *   "worker": "tsx watch src/infra/queue/bullmq/worker.ts"
 */

import { Worker, Job, ConnectionOptions } from "bullmq";
import { QUEUE_NAME, JobData, JobName, ExecuteProviderPurchaseData, ReconcileOrderData } from "./jobs";
import { ExecuteProviderPurchaseService } from "@/src/core/services/provider/execute-provider-purchase.service";
import { ReconcileOrderService } from "@/src/core/services/provider/reconcile-order.service";
import { OrderRepository } from "@/src/infra/db/repositories/order.repository";

const connection: ConnectionOptions = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

const orderRepository = new OrderRepository();
const executeService = new ExecuteProviderPurchaseService(orderRepository);
const reconcileService = new ReconcileOrderService(orderRepository);

const worker = new Worker<JobData, void, JobName>(
  QUEUE_NAME,
  async (job: Job<JobData, void, JobName>) => {
    console.log(`[Worker] Processing job ${job.id} — ${job.name}`);

    switch (job.name) {
      case "EXECUTE_PROVIDER_PURCHASE": {
        const { orderId } = job.data as ExecuteProviderPurchaseData;
        await executeService.execute(orderId);
        break;
      }

      case "RECONCILE_ORDER": {
        const { orderId } = job.data as ReconcileOrderData;
        await reconcileService.reconcile(orderId);
        break;
      }

      default:
        console.warn(`[Worker] Unknown job name: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} (${job.name}) completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

console.log(`[Worker] Listening on queue "${QUEUE_NAME}" …`);

export { worker };
