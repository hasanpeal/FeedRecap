import { Worker } from "bullmq";
import connection from "../config/redis";
import { StoredTweets, CustomProfilePosts } from "../models/tweet.model";
import { INSTANCE_ID } from "./instanceId";
import { retentionCleanupQueue, QUEUE_NAMES } from "./queues";

const RETENTION_DAYS = 7;

// Belt-and-suspenders for the per-fetch pruning already done in
// twitter.service.ts: this catches posts belonging to accounts that stopped
// being fetched (e.g. a custom profile no user follows anymore), which would
// otherwise sit in Mongo forever since nothing ever merges into their doc
// again.
async function pruneOldPosts(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [storedResult, profileResult] = await Promise.all([
    StoredTweets.updateMany(
      {},
      { $pull: { tweets: { createdAt: { $lt: cutoff } } } }
    ),
    CustomProfilePosts.updateMany(
      {},
      { $pull: { tweets: { createdAt: { $lt: cutoff } } } }
    ),
  ]);

  console.log(
    `🧹 [Retention Cleanup]: Pruned posts older than ${RETENTION_DAYS}d ` +
      `(${storedResult.modifiedCount} category docs, ${profileResult.modifiedCount} profile docs touched)`
  );
}

let retentionCleanupWorker: Worker;

export async function startRetentionCleanupJob(): Promise<void> {
  await retentionCleanupQueue.upsertJobScheduler(
    "retention-cleanup:daily",
    { pattern: "0 4 * * *", tz: "America/New_York" },
    { name: "prune-old-posts" }
  );

  retentionCleanupWorker = new Worker(
    QUEUE_NAMES.RETENTION_CLEANUP,
    async () => {
      console.log(`🎯 [Retention Cleanup]: Claimed by ${INSTANCE_ID}`);
      await pruneOldPosts();
    },
    { connection, concurrency: 1 }
  );

  retentionCleanupWorker.on("failed", (job, error) => {
    console.error(
      `❌ [Error]: Retention cleanup job "${job?.id}" failed:`,
      error
    );
  });
}

export function getRetentionCleanupWorkers(): Worker[] {
  return [retentionCleanupWorker].filter(Boolean);
}
