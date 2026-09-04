import IORedis from "ioredis";
import "./env";

// Single shared Redis connection for every BullMQ Queue/Worker in this
// process. `maxRetriesPerRequest: null` is required by BullMQ for any
// connection handed to a Worker (its blocking fetch loop needs unlimited
// retries); `enableReadyCheck: false` avoids spurious "not ready" errors on
// Railway's managed Redis during reconnects.
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new IORedis({
      host: process.env.REDISHOST,
      port: Number(process.env.REDISPORT),
      username: process.env.REDISUSER,
      password: process.env.REDISPASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

connection.on("error", (err) => console.error("❌ [Redis]: connection error", err));
connection.on("connect", () => console.log("Connected to Redis"));

export default connection;

export async function closeRedisConnection(): Promise<void> {
  await connection.quit();
}
