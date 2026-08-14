import "dotenv/config";
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { authRouter } from "./routes/auth";
import { emailRouter } from "./routes/email";
import { senderRouter } from "./routes/sender";
import { errorHandler } from "./middleware/errorHandler";
import "./queue/emailWorker";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

app.use("/auth", authRouter);
app.use("/api/auth", authRouter);
app.use("/api/emails", emailRouter);
app.use("/api/senders", senderRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
  logger.info(
    "Reminder: the email worker is a separate process — run `npm run worker` alongside this server."
  );
});
