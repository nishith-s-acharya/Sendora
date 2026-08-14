import IORedis from "ioredis";
import { env } from "../config/env";

// BullMQ requires maxRetriesPerRequest: null on the connection it manages.
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Separate lightweight client for plain Redis operations (rate-limit counters,
// idempotency locks) so we never contend with BullMQ's blocking commands.
export const redisClient = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
