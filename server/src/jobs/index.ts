import { startTweetFetchJob } from "./tweetFetchJob";
import { startNewsletterScheduler } from "./newsletterScheduler";
import { startWeeklyDigestJob } from "./weeklyDigestJob";

// Explicit, single entry point for every background job the server runs.
// Called once from server.ts rather than relying on import-time side
// effects, so it's obvious from server.ts what background work exists.
export function startBackgroundJobs(): void {
  startTweetFetchJob();
  startNewsletterScheduler();
  startWeeklyDigestJob();
}
