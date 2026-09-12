// Test-only stand-in for config/redis.ts. Real config/redis.ts opens a live
// connection to production Redis on import — never let a test touch that.
//
// BullMQ's Queue/Worker constructors duck-type their `connection` option as
// a real ioredis client, so we hand them one — but built with
// `lazyConnect: true` pointed at a throwaway local address, meaning it never
// actually dials out unless something explicitly issues a command (which no
// unit test in this suite should ever do; job logic mocks `bullmq` itself).
import IORedis from "ioredis";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 1,
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export default connection;

export async function closeRedisConnection(): Promise<void> {
  connection.disconnect();
}
