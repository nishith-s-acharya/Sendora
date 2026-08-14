import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection } from "./connection";
import { EMAIL_QUEUE_NAME, enqueueEmailJob, EmailJobPayload } from "./emailQueue";
import { prisma } from "../db/client";
import { sendEmail } from "../services/emailService";
import {
  tryReserveSendSlot,
  secondsUntilNextHourWindow,
} from "../services/rateLimitService";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Processes exactly one email send attempt.
 *
 * Idempotency: before doing anything, we re-read the EmailJob row from
 * Postgres (the source of truth) and bail out if it's already SENT. This
 * protects against BullMQ redelivering a job (e.g. after a crash mid-job)
 * and against the same job being picked up twice during a deploy overlap.
 *
 * Rate limiting: we reserve a Redis-backed send slot for
 * (senderId, currentHourWindow) atomically before sending. If the sender's
 * hourly limit is already used up, we do NOT fail the job — we push it into
 * the next hour window and re-enqueue a fresh BullMQ job for it, preserving
 * order as much as possible since jobs are re-queued in the order they were
 * originally due.
 */
async function processEmailJob(job: Job<EmailJobPayload>) {
  const { emailJobId, senderId, recipient, subject, body, hourlyLimit } =
    job.data;

  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
  });

  if (!emailJob) {
    logger.warn({ emailJobId }, "EmailJob row missing, skipping");
    return { skipped: true };
  }

  if (emailJob.status === "SENT") {
    logger.info({ emailJobId }, "Already sent, skipping duplicate delivery");
    return { skipped: true };
  }

  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: "PROCESSING" },
  });

  const reservation = await tryReserveSendSlot(senderId, hourlyLimit);

  if (!reservation.allowed) {
    const delaySec = secondsUntilNextHourWindow();
    const nextRunAt = new Date(Date.now() + delaySec * 1000);
    const nextBullJobId = `${emailJobId}-r${emailJob.retryCount + 1}`;

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "SCHEDULED",
        scheduledAt: nextRunAt,
        bullJobId: nextBullJobId,
        retryCount: { increment: 1 },
      },
    });

    await enqueueEmailJob(
      { emailJobId, senderId, recipient, subject, body, hourlyLimit },
      delaySec * 1000
    );

    logger.info(
      { emailJobId, senderId, nextRunAt },
      "Hourly limit reached, rescheduled to next window"
    );
    return { rescheduled: true, nextRunAt };
  }

  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) {
    throw new Error(`Sender ${senderId} not found`);
  }

  try {
    const result = await sendEmail(sender, recipient, subject, body);
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "SENT", sentAt: new Date(), errorMessage: null },
    });
    return { sent: true, previewUrl: result.previewUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "FAILED",
        errorMessage: message,
        retryCount: { increment: 1 },
      },
    });
    // Rethrow so BullMQ applies its own retry/backoff policy on top.
    throw err;
  }
}

/**
 * Startup reconciliation.
 *
 * BullMQ's own delayed jobs already survive a Redis restart on their own —
 * this function exists for the edge case where the *app* crashed between
 * writing the EmailJob row to Postgres and successfully enqueuing its
 * BullMQ job (or crashed mid-send, leaving a row stuck in PROCESSING).
 *
 * `enqueueEmailJob` uses the EmailJob id as the BullMQ jobId, so calling it
 * again for a job that's already queued/delayed is a safe no-op — BullMQ
 * will not create a duplicate. This keeps the "survives restarts, no lost
 * or duplicated jobs" guarantee even in that narrow crash window.
 */
async function reconcileUnfinishedJobs() {
  const stuck = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "QUEUED", "PROCESSING"] } },
  });

  if (stuck.length === 0) return;

  let requeued = 0;
  for (const job of stuck) {
    const delayMs = Math.max(job.scheduledAt.getTime() - Date.now(), 0);
    await enqueueEmailJob(
      {
        emailJobId: job.id,
        senderId: job.senderId,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
        hourlyLimit: job.hourlyLimit,
      },
      delayMs
    );
    requeued++;
  }
  logger.info(
    { requeued },
    "Reconciled unfinished EmailJob rows against the queue on startup"
  );
}

reconcileUnfinishedJobs().catch((err) =>
  logger.error({ err }, "Startup reconciliation failed")
);

export const emailWorker = new Worker<EmailJobPayload>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
    // Enforces the minimum delay between individual email sends: this worker
    // will process at most 1 job per MIN_DELAY_BETWEEN_SENDS_MS, regardless
    // of how many jobs are ready, complementing the per-recipient stagger
    // already baked into scheduledAt by the scheduler service.
    limiter: {
      max: 1,
      duration: env.MIN_DELAY_BETWEEN_SENDS_MS,
    },
  }
);

emailWorker.on("completed", (job) => {
  logger.debug({ jobId: job.id }, "Job completed");
});

emailWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Job failed");
});

logger.info(
  { concurrency: env.WORKER_CONCURRENCY },
  "Email worker started and listening for jobs"
);
