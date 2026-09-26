import type { NextFunction, Request, Response } from "express";

const evalMock = jest.fn();

jest.mock("../../config/redis", () => ({
  __esModule: true,
  default: {
    eval: (...args: unknown[]) => evalMock(...args),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue("OK"),
  },
}));

import { consumeRateLimit, rateLimit } from "../rateLimit.middleware";

describe("rateLimit middleware", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  function mocks() {
    const req = {
      ip: "203.0.113.10",
      socket: { remoteAddress: "203.0.113.11" },
    } as unknown as Request;
    const setHeader = jest.fn();
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { setHeader, status } as unknown as Response;
    const next = jest.fn() as NextFunction;
    return { req, res, next, setHeader, status, json };
  }

  it("atomically consumes a Redis-backed counter", async () => {
    evalMock.mockResolvedValue([2, 45000]);

    await expect(consumeRateLimit("rate-limit:test:ip", 60000)).resolves.toEqual({
      count: 2,
      ttlMs: 45000,
    });
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("INCR", KEYS[1])'),
      1,
      "rate-limit:test:ip",
      "60000"
    );
  });

  it("allows requests below the limit and emits rate-limit headers", async () => {
    evalMock.mockResolvedValue([2, 30000]);
    const limiter = rateLimit({ keyPrefix: "test", limit: 3, windowMs: 60000 });
    const { req, res, next, setHeader, status } = mocks();

    await limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith("RateLimit-Limit", "3");
    expect(setHeader).toHaveBeenCalledWith("RateLimit-Remaining", "1");
  });

  it("returns 429 with Retry-After when the limit is exceeded", async () => {
    evalMock.mockResolvedValue([4, 25000]);
    const limiter = rateLimit({
      keyPrefix: "test",
      limit: 3,
      windowMs: 60000,
      message: "Slow down",
    });
    const { req, res, next, setHeader, status, json } = mocks();

    await limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith("Retry-After", "25");
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ code: 1, message: "Slow down" });
  });

  it("fails open if Redis is unavailable", async () => {
    evalMock.mockRejectedValue(new Error("redis down"));
    const limiter = rateLimit({ keyPrefix: "test", limit: 3, windowMs: 60000 });
    const { req, res, next, status } = mocks();

    await limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it("bypasses Redis during route tests", async () => {
    process.env.NODE_ENV = "test";
    const limiter = rateLimit({ keyPrefix: "test", limit: 3, windowMs: 60000 });
    const { req, res, next } = mocks();

    await limiter(req, res, next);

    expect(evalMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
