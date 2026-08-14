import { redisClient } from "../queue/connection";

/**
 * Rate limiting strategy
 * ------------------------------------------------------------------
 * Key: rate:{senderId}:{hourWindow}   where hourWindow = floor(unixSeconds / 3600)
 * Value: atomic counter, incremented once per attempted send for that sender.
 * TTL: 3600s (auto-expires so we never need a cleanup job).
 *
 * INCR is atomic in Redis, so this is safe across multiple worker processes
 * or multiple app instances hitting the same Redis — no in-memory counters
 * are used anywhere in the rate-limiting path.
 */

export function hourWindowFor(date: Date): number {
  return Math.floor(date.getTime() / 1000 / 3600);
}

function rateKey(senderId: string, hourWindow: number): string {
  return `rate:${senderId}:${hourWindow}`;
}

/**
 * Atomically reserve one "send slot" for a sender in the current hour window.
 * Returns true if the send is allowed (and the slot is now reserved),
 * false if the sender's hourly limit has already been reached.
 */
export async function tryReserveSendSlot(
  senderId: string,
  limit: number,
  at: Date = new Date()
): Promise<{ allowed: boolean; hourWindow: number; count: number }> {
  const hourWindow = hourWindowFor(at);
  const key = rateKey(senderId, hourWindow);

  const count = await redisClient.incr(key);
  if (count === 1) {
    // First increment in this window — set expiry so the counter self-cleans.
    await redisClient.expire(key, 3600);
  }

  if (count > limit) {
    // Over budget: release our reservation since this job will be rescheduled,
    // not sent, and shouldn't count against the window it didn't use.
    await redisClient.decr(key);
    return { allowed: false, hourWindow, count: count - 1 };
  }

  return { allowed: true, hourWindow, count };
}

/** Seconds until the given hour window rolls over into the next one. */
export function secondsUntilNextHourWindow(at: Date = new Date()): number {
  const msIntoHour = at.getTime() % (3600 * 1000);
  return Math.ceil((3600 * 1000 - msIntoHour) / 1000);
}
