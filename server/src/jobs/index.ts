import { startTweetFetchJob, getTweetFetchWorkers } from "./tweetFetch.job";
import { startNewsletterScheduler, getNewsletterWorkers } from "./newsletter.job";
import { startWeeklyDigestJob, getWeeklyDigestWorkers } from "./weeklyDigest.job";
import { allQueues } from "./queues";
import { closeRedisConnection } from "../config/redis";

export function startBackgroundJobs(): void {
  startTweetFetchJob().catch(console.error);
  startNewsletterScheduler().catch(console.error);
  startWeeklyDigestJob().catch(console.error);
}

// Called from server.ts's SIGTERM handler so in-flight jobs finish (or get
// reclaimed by another replica) instead of being killed mid-run.
export async function stopBackgroundJobs(): Promise<void> {
  await Promise.all(
    [
      ...getTweetFetchWorkers(),
      ...getNewsletterWorkers(),
      ...getWeeklyDigestWorkers(),
    ].map((worker) => worker.close())
  );
  await Promise.all(allQueues.map((queue) => queue.close()));
  await closeRedisConnection();
}
