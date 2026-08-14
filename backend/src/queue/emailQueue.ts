import { Queue } from "bullmq";
import { redisConnection } from "./connection";

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    // Keep a bounded history so Redis memory doesn't grow unbounded, but keep
    // enough completed/failed jobs around for debugging.
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 1000 },
  },
});

export interface EmailJobPayload {
  emailJobId: string; // FK into EmailJob table — the source of truth
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
}

/**
 * Enqueue a single email as a BullMQ delayed job.
 *
 * Idempotency: we use the EmailJob's own DB id as the BullMQ jobId. BullMQ
 * silently no-ops (does not create a duplicate) if a job with the same id
 * already exists in the queue, so re-running the scheduling code for the
 * same EmailJob row can never produce two queued sends.
 */
export async function enqueueEmailJob(
  payload: EmailJobPayload,
  delayMs: number
) {
  return emailQueue.add("send-email", payload, {
    jobId: payload.emailJobId,
    delay: Math.max(delayMs, 0),
  });
}
