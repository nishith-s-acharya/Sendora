import nodemailer from "nodemailer";
import type { Sender } from "@prisma/client";
import { logger } from "../utils/logger";

/**
 * Creates a brand-new Ethereal Email test account. Used when a user adds a
 * sender without supplying ETHEREAL_USER/ETHEREAL_PASS in the env — each
 * sender gets its own disposable inbox so multi-sender rate limiting is
 * easy to demo (you can log into each Ethereal inbox separately).
 */
export async function createEtherealAccount() {
  const account = await nodemailer.createTestAccount();
  return {
    email: account.user,
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    username: account.user,
    password: account.pass,
  };
}

const transporterCache = new Map<string, nodemailer.Transporter>();

function getTransporter(sender: Sender): nodemailer.Transporter {
  const cacheKey = sender.id;
  let transporter = transporterCache.get(cacheKey);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: { user: sender.username, pass: sender.password },
    });
    transporterCache.set(cacheKey, transporter);
  }
  return transporter;
}

export async function sendEmail(
  sender: Sender,
  to: string,
  subject: string,
  body: string
) {
  const transporter = getTransporter(sender);
  const info = await transporter.sendMail({
    from: `"${sender.label ?? sender.email}" <${sender.email}>`,
    to,
    subject,
    text: body,
    html: `<div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(
      body
    )}</div>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  if (previewUrl) {
    logger.info({ previewUrl, to }, "Ethereal preview URL for sent email");
  }
  return { messageId: info.messageId, previewUrl };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
