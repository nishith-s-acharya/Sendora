import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/authMiddleware";
import { prisma } from "../db/client";
import { Response } from "express";

export const senderRouter = Router();

senderRouter.use(requireAuth);

senderRouter.get("/", async (req: AuthedRequest, res: Response) => {
  const senders = await prisma.sender.findMany({
    where: { userId: req.user!.userId },
    select: { id: true, label: true, email: true, isDefault: true },
  });
  res.json(senders);
});
