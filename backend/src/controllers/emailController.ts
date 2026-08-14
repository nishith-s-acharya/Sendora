import { Response } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { AuthedRequest } from "../middleware/authMiddleware";
import { scheduleEmailBatch } from "../services/schedulerService";
import { env } from "../config/env";

const scheduleSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  startTime: z.string().datetime().or(z.string().min(1)), // ISO string from <input type="datetime-local">
  delaySeconds: z.number().int().min(0).default(2),
  hourlyLimit: z
    .number()
    .int()
    .min(1)
    .default(env.MAX_EMAILS_PER_HOUR_PER_SENDER),
  senderId: z.string().uuid().optional(),
});

export async function scheduleEmails(req: AuthedRequest, res: Response) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const input = parsed.data;
  const userId = req.user!.userId;

  let senderId = input.senderId;
  if (!senderId) {
    const defaultSender = await prisma.sender.findFirst({
      where: { userId, isDefault: true },
    });
    if (!defaultSender) {
      return res
        .status(400)
        .json({ error: "No sender available for this account" });
    }
    senderId = defaultSender.id;
  } else {
    const owned = await prisma.sender.findFirst({
      where: { id: senderId, userId },
    });
    if (!owned) {
      return res.status(403).json({ error: "Sender does not belong to you" });
    }
  }

  const startTime = new Date(input.startTime);
  if (isNaN(startTime.getTime())) {
    return res.status(400).json({ error: "Invalid startTime" });
  }

  const { batch, jobs } = await scheduleEmailBatch({
    userId,
    senderId,
    subject: input.subject,
    body: input.body,
    recipients: input.recipients,
    startTime,
    delaySeconds: input.delaySeconds,
    hourlyLimit: input.hourlyLimit,
  });

  return res.status(201).json({
    batchId: batch.id,
    scheduledCount: jobs.length,
  });
}

export async function listScheduled(req: AuthedRequest, res: Response) {
  const userId = req.user!.userId;
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ["SCHEDULED", "QUEUED", "PROCESSING"] },
      batch: { userId },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });
  return res.json(
    jobs.map((j) => ({
      id: j.id,
      email: j.recipient,
      subject: j.subject,
      scheduledTime: j.scheduledAt,
      status: j.status,
    }))
  );
}

export async function listSent(req: AuthedRequest, res: Response) {
  const userId = req.user!.userId;
  const jobs = await prisma.emailJob.findMany({
    where: {
      status: { in: ["SENT", "FAILED"] },
      batch: { userId },
    },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  return res.json(
    jobs.map((j) => ({
      id: j.id,
      email: j.recipient,
      subject: j.subject,
      sentTime: j.sentAt,
      status: j.status === "SENT" ? "sent" : "failed",
      errorMessage: j.errorMessage,
    }))
  );
}

export async function getEmailById(req: AuthedRequest, res: Response) {
  const userId = req.user!.userId;
  const { id } = req.params;

  const job = await prisma.emailJob.findFirst({
    where: { id, batch: { userId } },
    include: { sender: { select: { id: true, email: true, label: true } } },
  });

  if (!job) {
    return res.status(404).json({ error: "Email job not found" });
  }

  return res.json({
    id: job.id,
    batchId: job.batchId,
    recipient: job.recipient,
    subject: job.subject,
    body: job.body,
    scheduledAt: job.scheduledAt,
    sentAt: job.sentAt,
    status: job.status,
    delaySeconds: job.delaySeconds,
    hourlyLimit: job.hourlyLimit,
    sender: job.sender,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
  });
}

export async function getStats(req: AuthedRequest, res: Response) {
  const userId = req.user!.userId;
  const [scheduled, sent, failed] = await Promise.all([
    prisma.emailJob.count({
      where: {
        status: { in: ["SCHEDULED", "QUEUED", "PROCESSING"] },
        batch: { userId },
      },
    }),
    prisma.emailJob.count({ where: { status: "SENT", batch: { userId } } }),
    prisma.emailJob.count({ where: { status: "FAILED", batch: { userId } } }),
  ]);
  return res.json({ scheduled, sent, failed });
}

