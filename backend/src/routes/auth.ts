import { Router } from "express";
import { googleLogin, getMe } from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

export const authRouter = Router();

authRouter.post("/google", googleLogin);
authRouter.get("/me", requireAuth, getMe);
