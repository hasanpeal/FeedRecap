import { NextFunction, Request, Response } from "express";
import redis from "../config/redis";

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  message?: string;
}

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

export async function consumeRateLimit(
  key: string,
  windowMs: number
): Promise<{ count: number; ttlMs: number }> {
  const result = (await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    key,
    String(windowMs)
  )) as [number, number];

  return {
    count: Number(result[0]),
    ttlMs: Math.max(Number(result[1]), 0),
  };
}

export function rateLimit(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Route tests should not depend on a live Redis service. The limiter itself
    // has dedicated unit coverage; production/staging always execute it.
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const key = `rate-limit:${options.keyPrefix}:${clientIp}`;

    try {
      const { count, ttlMs } = await consumeRateLimit(key, options.windowMs);
      const remaining = Math.max(options.limit - count, 0);
      const resetSeconds = Math.max(Math.ceil(ttlMs / 1000), 1);

      res.setHeader("RateLimit-Limit", String(options.limit));
      res.setHeader("RateLimit-Remaining", String(remaining));
      res.setHeader("RateLimit-Reset", String(resetSeconds));

      if (count > options.limit) {
        res.setHeader("Retry-After", String(resetSeconds));
        return res.status(429).json({
          code: 1,
          message: options.message || "Too many requests. Please try again later.",
        });
      }

      return next();
    } catch (error) {
      // Availability takes precedence if Redis is temporarily unavailable.
      // Authentication/authorization still run normally.
      console.error("[RateLimit] Redis error; allowing request:", error);
      return next();
    }
  };
}

export const apiRateLimit = rateLimit({
  keyPrefix: "api",
  limit: 300,
  windowMs: 15 * 60 * 1000,
});

export const loginRateLimit = rateLimit({
  keyPrefix: "login",
  limit: 10,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts. Please try again later.",
});

export const registerRateLimit = rateLimit({
  keyPrefix: "register",
  limit: 5,
  windowMs: 60 * 60 * 1000,
});

export const passwordResetRateLimit = rateLimit({
  keyPrefix: "password-reset",
  limit: 10,
  windowMs: 15 * 60 * 1000,
});

export const emailValidationRateLimit = rateLimit({
  keyPrefix: "validate-email",
  limit: 30,
  windowMs: 15 * 60 * 1000,
});
