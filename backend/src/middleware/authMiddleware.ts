import { Request, Response, NextFunction } from "express";
import { verifyAppJwt } from "../utils/jwt";

export interface AuthedRequest extends Request {
  user?: { userId: string; email: string };
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const token = header.slice("Bearer ".length);
  try {
    req.user = verifyAppJwt(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
