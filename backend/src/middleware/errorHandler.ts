import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  logger.error({ err, path: req.path }, "Unhandled request error");
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
