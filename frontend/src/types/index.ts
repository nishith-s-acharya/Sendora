export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export type JobStatus =
  | "SCHEDULED"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "FAILED";

export interface ScheduledEmailRow {
  id: string;
  email: string;
  subject: string;
  scheduledTime: string;
  status: JobStatus;
}

export interface SentEmailRow {
  id: string;
  email: string;
  subject: string;
  sentTime: string | null;
  status: "sent" | "failed";
  errorMessage?: string | null;
}

export interface StatsResponse {
  scheduled: number;
  sent: number;
  failed: number;
}

export interface Sender {
  id: string;
  label: string;
  email: string;
  isDefault: boolean;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  senderId?: string;
}

export interface EmailDetail {
  id: string;
  batchId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: JobStatus;
  delaySeconds: number;
  hourlyLimit: number;
  sender?: { id: string; email: string; label: string } | null;
  errorMessage?: string | null;
  createdAt: string;
}

