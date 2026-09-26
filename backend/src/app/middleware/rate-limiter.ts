import { Context, Next } from "hono";
import { AppError } from "../../lib/errors";

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const stores = new Map<string, Map<string, RateLimitStore>>();

/**
 * In-memory sliding window rate limiter middleware for critical security endpoints.
 *
 * @param windowMs Time window in milliseconds (e.g. 15 * 60 * 1000 for 15 minutes)
 * @param maxMax Maximum requests allowed within windowMs
 * @param keyPrefix Unique bucket name (e.g. 'auth-login', 'ai-chat')
 */
export function rateLimiter(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = "default" } = opts;

  if (!stores.has(keyPrefix)) {
    stores.set(keyPrefix, new Map<string, RateLimitStore>());
  }

  const bucket = stores.get(keyPrefix)!;

  return async (c: Context, next: Next) => {
    // In test environment, bypass rate limiting to prevent test suite interference
    if (process.env.NODE_ENV === "test") {
      await next();
      return;
    }

    const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "127.0.0.1";
    const now = Date.now();
    const record = bucket.get(ip);

    if (!record || now > record.resetTime) {
      bucket.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
    } else {
      record.count++;
      if (record.count > max) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        c.header("Retry-After", String(retryAfterSeconds));
        throw new AppError(`Too Many Requests: Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`, 429);
      }
    }

    await next();
  };
}
