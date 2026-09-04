import { startTweetFetchJob, getTweetFetchWorkers } from "./tweetFetch.job";
import { startNewsletterScheduler, getNewsletterWorkers } from "./newsletter.job";
import { startWeeklyDigestJob, getWeeklyDigestWorkers } from "./weeklyDigest.job";
import {
  startRetentionCleanupJob,
  getRetentionCleanupWorkers,
} from "./retention.job";
import { allQueues } from "./queues";
import { closeRedisConnection } from "../config/redis";

export function startBackgroundJobs(): void {
  startTweetFetchJob().catch((error) =>
    console.error("[TweetFetch] Failed to start job:", error)
  );
  startNewsletterScheduler().catch((error) =>
    console.error("[Newsletter] Failed to start scheduler:", error)
  );
  startWeeklyDigestJob().catch((error) =>
    console.error("[WeeklyDigest] Failed to start job:", error)
  );
  startRetentionCleanupJob().catch((error) =>
    console.error("[Retention] Failed to start job:", error)
  );
}

// Called from server.ts's SIGTERM handler so in-flight jobs finish (or get
// reclaimed by another replica) instead of being killed mid-run.
export async function stopBackgroundJobs(): Promise<void> {
  await Promise.all(
    [
      ...getTweetFetchWorkers(),
      ...getNewsletterWorkers(),
      ...getWeeklyDigestWorkers(),
      ...getRetentionCleanupWorkers(),
    ].map((worker) => worker.close())
  );
  await Promise.all(allQueues.map((queue) => queue.close()));
  await closeRedisConnection();
}
