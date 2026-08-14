import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../db/client";
import { env } from "../config/env";
import { signAppJwt } from "../utils/jwt";
import { createEtherealAccount } from "../services/emailService";
import { AuthedRequest } from "../middleware/authMiddleware";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const googleLoginSchema = z.object({
  credential: z.string().min(1), // Google Identity Services ID token
});

/**
 * Frontend uses Google Identity Services (One Tap / Sign in with Google
 * button) to obtain a signed ID token directly from Google — no OAuth
 * redirect dance needed. We verify that token's signature and audience
 * server-side, which is the standard, secure way to do "Sign in with
 * Google" for an SPA.
 */
export async function googleLogin(req: Request, res: Response) {
  const parsed = googleLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "credential is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  if (!payload?.sub || !payload.email) {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    update: {
      name: payload.name ?? payload.email,
      email: payload.email,
      avatar: payload.picture,
    },
    create: {
      googleId: payload.sub,
      name: payload.name ?? payload.email,
      email: payload.email,
      avatar: payload.picture,
    },
  });

  // Every new user gets a default Ethereal sender so they can schedule
  // emails immediately without a separate "connect a sender" step.
  const existingSender = await prisma.sender.findFirst({
    where: { userId: user.id, isDefault: true },
  });
  if (!existingSender) {
    const creds =
      env.ETHEREAL_USER && env.ETHEREAL_PASS
        ? {
            email: env.ETHEREAL_USER,
            smtpHost: "smtp.ethereal.email",
            smtpPort: 587,
            username: env.ETHEREAL_USER,
            password: env.ETHEREAL_PASS,
          }
        : await createEtherealAccount();

    await prisma.sender.create({
      data: { userId: user.id, label: "Default sender", isDefault: true, ...creds },
    });
  }

  const token = signAppJwt({ userId: user.id, email: user.email });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
}

export async function getMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  });
}
