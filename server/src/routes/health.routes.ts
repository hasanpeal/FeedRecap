import express from "express";
import db from "../config/db";
import redis from "../config/redis";

const router = express.Router();

async function checkRedis() {
  const started = Date.now();
  try {
    await redis.ping();
    return { status: "up" as const, latencyMs: Date.now() - started };
  } catch {
    return { status: "down" as const, latencyMs: Date.now() - started };
  }
}

function checkMongo() {
  const started = Date.now();
  const up = db.readyState === 1;
  return {
    status: up ? ("up" as const) : ("down" as const),
    latencyMs: Date.now() - started,
  };
}

router.get("/health", async (_req, res) => {
  const [redisStatus, mongoStatus] = await Promise.all([
    checkRedis(),
    Promise.resolve(checkMongo()),
  ]);

  const healthy =
    redisStatus.status === "up" && mongoStatus.status === "up";

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    dependencies: {
      mongodb: mongoStatus,
      redis: redisStatus,
    },
  });
});

export default router;
