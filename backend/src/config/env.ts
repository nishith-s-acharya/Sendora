import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  NODE_ENV: process.env.NODE_ENV ?? "development",

  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: required("REDIS_URL"),

  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",

  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

  ETHEREAL_USER: process.env.ETHEREAL_USER ?? "",
  ETHEREAL_PASS: process.env.ETHEREAL_PASS ?? "",

  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? "200",
    10
  ),
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
  MIN_DELAY_BETWEEN_SENDS_MS: parseInt(
    process.env.MIN_DELAY_BETWEEN_SENDS_MS ?? "2000",
    10
  ),

  // Note: the sample .env had a stray trailing "f" (http://localhost:5173f).
  // We strip any trailing non-URL characters defensively so CORS doesn't
  // silently break because of a typo in the .env file.
  FRONTEND_URL: (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(
    /[^\w:/.\-]+$/,
    ""
  ),
};
