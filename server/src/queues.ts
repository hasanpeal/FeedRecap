import { Queue } from "bullmq";
import connection from "./redis";

// Single source of truth for queue names, shared between digest.ts (which
// creates the matching Worker for each) and anything else that needs to
// inspect them later (e.g. a future admin health route).
export const QUEUE_NAMES = {
  NEWSLETTER: "newsletter",
  TWEET_FETCH: "tweet-fetch",
  WEEKLY_DIGEST: "weekly-digest",
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
export const tweetFetchQueue = new Queue(QUEUE_NAMES.TWEET_FETCH, {
  connection,
  defaultJobOptions,
});
export const weeklyDigestQueue = new Queue(QUEUE_NAMES.WEEKLY_DIGEST, {
  connection,
  defaultJobOptions,
});

export const allQueues = [newsletterQueue, tweetFetchQueue, weeklyDigestQueue];
