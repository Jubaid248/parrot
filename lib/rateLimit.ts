import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// The Upstash integration on Vercel sets KV_REST_API_*; a manual setup uses UPSTASH_REDIS_REST_*
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

if (!redis) {
  console.warn("⚠️ [RateLimit] Upstash Redis is not configured. Requests are not rate limited.");
}

function limiter(prefix: string, requests: number, window: `${number} ${"m" | "h" | "d"}`) {
  return redis
    ? new Ratelimit({ redis, prefix: `parrot:${prefix}`, limiter: Ratelimit.slidingWindow(requests, window) })
    : null;
}

// Per-user budgets. Each interview is ~8–15 answers, so these leave plenty of room
// for honest practice while capping what one account can spend on AI calls.
const limiters = {
  startHourly: limiter("start:h", 6, "1 h"),
  startDaily: limiter("start:d", 20, "1 d"),
  answer: limiter("answer", 120, "1 h"),
  end: limiter("end", 15, "1 h"),
  resume: limiter("resume", 20, "1 h"),
};

export type RateLimitKey = keyof typeof limiters;

/**
 * Checks the given budgets for a user. Returns a 429 response to send back when
 * any of them is used up, or null when the request may go ahead.
 */
export async function rateLimit(userId: string, ...keys: RateLimitKey[]): Promise<NextResponse | null> {
  for (const key of keys) {
    const l = limiters[key];
    if (!l) continue;
    const { success, reset } = await l.limit(userId);
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      const minutes = Math.ceil(retryAfter / 60);
      return NextResponse.json(
        { error: `You've reached the practice limit for now. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
  }
  return null;
}
