import { prisma } from "../db/client";
import { enqueueEmailJob } from "../queue/emailQueue";
import { logger } from "../utils/logger";

export interface ScheduleEmailInput {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delaySeconds: number;
  hourlyLimit: number;
}

/**
 * Schedules a batch of emails.
 *
 * Each recipient gets its own EmailJob row and its own BullMQ delayed job.
 * Recipients are staggered `delaySeconds` apart starting at `startTime`,
 * which is what gives us the "minimum delay between individual sends"
 * behavior at scheduling time. The worker's rate limiter (per sender, per
 * hour) is the second, independent safety net enforced at send time.
 */
export async function scheduleEmailBatch(input: ScheduleEmailInput) {
  const batch = await prisma.emailBatch.create({
    data: {
      userId: input.userId,
      subject: input.subject,
      body: input.body,
      startTime: input.startTime,
      delaySeconds: input.delaySeconds,
      hourlyLimit: input.hourlyLimit,
      totalRecipients: input.recipients.length,
    },
  });

  const now = Date.now();

  // Create all EmailJob rows first (single DB round trip) so we always have
  // a durable record, then enqueue BullMQ jobs referencing their ids.
  const jobsData = input.recipients.map((recipient, i) => {
    const scheduledAt = new Date(
      input.startTime.getTime() + i * input.delaySeconds * 1000
    );
    return {
      batchId: batch.id,
      senderId: input.senderId,
      recipient,
      subject: input.subject,
      body: input.body,
      scheduledAt,
      delaySeconds: input.delaySeconds,
      hourlyLimit: input.hourlyLimit,
    };
  });

  await prisma.emailJob.createMany({ data: jobsData });

  const createdJobs = await prisma.emailJob.findMany({
    where: { batchId: batch.id },
    orderBy: { scheduledAt: "asc" },
  });

  for (const job of createdJobs) {
    const delayMs = Math.max(job.scheduledAt.getTime() - now, 0);
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
    await prisma.emailJob.update({
      where: { id: job.id },
      data: { status: "QUEUED", bullJobId: job.id },
    });
  }

  logger.info(
    { batchId: batch.id, count: createdJobs.length },
    "Scheduled email batch"
  );

  return { batch, jobs: createdJobs };
}
