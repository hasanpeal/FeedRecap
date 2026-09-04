import { Queue } from "bullmq";
import connection from "../config/redis";

// Single source of truth for queue names, shared between the job files (which
// create the matching Worker for each) and anything else that needs to
// inspect them later (e.g. a future admin health route).
//
// NEWSLETTER/TWEET_FETCH are lightweight "dispatch" queues: their scheduled
// occurrence just fans work out into many individual jobs on the matching
// *_TASK queue below, so all replicas' task Workers can pull and process
// them concurrently instead of one replica doing everything itself.
export const QUEUE_NAMES = {
  NEWSLETTER: "newsletter",
  NEWSLETTER_TASK: "newsletter-task",
  TWEET_FETCH: "tweet-fetch",
  TWEET_FETCH_TASK: "tweet-fetch-task",
  WEEKLY_DIGEST: "weekly-digest",
  RETENTION_CLEANUP: "retention-cleanup",
} as const;

const defaultJobOptions = {
  // Bounds Redis growth for job history.
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

export const newsletterQueue = new Queue(QUEUE_NAMES.NEWSLETTER, {
  connection,
  defaultJobOptions,
});
export const newsletterTaskQueue = new Queue(QUEUE_NAMES.NEWSLETTER_TASK, {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    // Per-user task, so a transient OpenAI/SendGrid failure just retries
    // that one user instead of the old "retry the whole batch" approach.
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
  },
});
export const tweetFetchQueue = new Queue(QUEUE_NAMES.TWEET_FETCH, {
  connection,
  defaultJobOptions,
});
export const tweetFetchTaskQueue = new Queue(QUEUE_NAMES.TWEET_FETCH_TASK, {
  connection,
  defaultJobOptions: {
    ...defaultJobOptions,
    // Per-category/per-profile task, replacing the old manual "retry
    // failed profiles once" loop.
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});
export const weeklyDigestQueue = new Queue(QUEUE_NAMES.WEEKLY_DIGEST, {
  connection,
  defaultJobOptions,
});
export const retentionCleanupQueue = new Queue(QUEUE_NAMES.RETENTION_CLEANUP, {
  connection,
  defaultJobOptions,
});

export const allQueues = [
  newsletterQueue,
  newsletterTaskQueue,
  tweetFetchQueue,
  tweetFetchTaskQueue,
  weeklyDigestQueue,
  retentionCleanupQueue,
];
