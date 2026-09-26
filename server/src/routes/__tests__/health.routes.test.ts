import express from "express";
import request from "supertest";
import db from "../../config/db";
import redis from "../../config/redis";
import healthRoutes from "../health.routes";

const app = express();
app.use(healthRoutes);

describe("GET /health", () => {
  beforeEach(() => {
    Object.defineProperty(db, "readyState", { value: 1, configurable: true });
    jest.spyOn(redis, "ping").mockResolvedValue("PONG");
  });

  it("returns 200 with dependency and process health", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "ok",
        timestamp: expect.any(String),
        uptimeSeconds: expect.any(Number),
        environment: expect.any(String),
        dependencies: {
          mongodb: expect.objectContaining({ status: "up", latencyMs: expect.any(Number) }),
          redis: expect.objectContaining({ status: "up", latencyMs: expect.any(Number) }),
        },
      })
    );
  });

  it("returns 503 when MongoDB is unavailable", async () => {
    Object.defineProperty(db, "readyState", { value: 0, configurable: true });
    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.dependencies.mongodb.status).toBe("down");
  });

  it("returns 503 when Redis is unavailable", async () => {
    jest.spyOn(redis, "ping").mockRejectedValue(new Error("redis unavailable"));
    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.dependencies.redis.status).toBe("down");
  });
});
