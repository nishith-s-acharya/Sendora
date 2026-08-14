import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  scheduleEmails,
  listScheduled,
  listSent,
  getEmailById,
  getStats,
} from "../controllers/emailController";

export const emailRouter = Router();

emailRouter.use(requireAuth);
emailRouter.post("/schedule", scheduleEmails);
emailRouter.get("/scheduled", listScheduled);
emailRouter.get("/sent", listSent);
emailRouter.get("/stats", getStats);
emailRouter.get("/:id", getEmailById);

