import { Worker } from "bullmq";
import moment from "moment-timezone";
import connection from "../config/redis";
import { User } from "../models/user.model";
import {
  fetchAndStoreTweets,
  fetchAndStoreTweetsForProfiles,
} from "../services/twitter.service";
import { INSTANCE_ID } from "./instanceId";
import {
  tweetFetchQueue,
  tweetFetchTaskQueue,
  QUEUE_NAMES,
} from "./queues";

const TWEET_CATEGORIES: string[] = [
  "Politics",
  "Geopolitics",
  "Finance",
  "AI",
  "Tech",
  "Crypto",
  "Meme",
  "Sports",
  "Entertainment",
];

type TweetFetchTaskData =
  | { type: "category"; category: string }
  | { type: "profile"; profile: string };

// Dispatcher: runs once per hour, on whichever replica's Worker claims the
// scheduled occurrence. Fans the actual fetching out into one task per
// category and one task per custom profile instead of doing it all here, so
// every replica's task Worker can pick tasks up and run them concurrently.
// Deterministic jobIds (keyed by this hour) make re-dispatching idempotent —
// if this dispatch job gets retried/reclaimed, re-adding the same task
// jobIds is a no-op rather than double-fetching.
async function dispatchTweetFetchTasks(): Promise<void> {
  const hourKey = moment().tz("America/New_York").format("YYYY-MM-DD-HH");

  for (const category of TWEET_CATEGORIES) {
    await tweetFetchTaskQueue.add(
      "fetch-category",
      { type: "category", category } as TweetFetchTaskData,
      { jobId: `tweet-fetch-${hourKey}-category-${category}` }
    );
  }

  const users = await User.find({ wise: "customProfiles" }).exec();
  const uniqueProfiles = new Set<string>();
  for (const user of users) {
    user.profiles.forEach((profile: string) => uniqueProfiles.add(profile));
  }

  for (const profile of Array.from(uniqueProfiles)) {
    await tweetFetchTaskQueue.add(
      "fetch-profile",
      { type: "profile", profile } as TweetFetchTaskData,
      { jobId: `tweet-fetch-${hourKey}-profile-${profile}` }
    );
  }

  console.log(
    `[TweetFetch] Dispatched ${TWEET_CATEGORIES.length} category tasks and ${uniqueProfiles.size} profile tasks for ${hourKey}`
  );
}

// Runs at minute 0 of every hour except 9 AM, 3 PM and 8 PM Eastern (those
// are reserved for the newsletter sends).
let tweetFetchWorker: Worker;
let tweetFetchTaskWorker: Worker;

export async function startTweetFetchJob(): Promise<void> {
  await tweetFetchQueue.upsertJobScheduler(
    "tweet-fetch:hourly",
    { pattern: "0 0-8,10-14,16-19,21-23 * * *", tz: "America/New_York" },
    { name: "fetch-tweets" }
  );

  tweetFetchWorker = new Worker(
    QUEUE_NAMES.TWEET_FETCH,
    async () => {
      console.log(`[TweetFetch] Dispatch claimed by ${INSTANCE_ID}`);
      await dispatchTweetFetchTasks();
    },
    { connection, concurrency: 1 }
  );
  tweetFetchWorker.on("failed", (job, error) => {
    console.error(`[TweetFetch] Dispatch job "${job?.id}" failed:`, error);
  });

  // Every replica runs one of these workers, listening on the same task
  // queue, so tasks get pulled by whichever replica is free — actual load
  // spread across all replicas instead of one replica doing everything.
  tweetFetchTaskWorker = new Worker(
    QUEUE_NAMES.TWEET_FETCH_TASK,
    async (job) => {
      const data = job.data as TweetFetchTaskData;
      console.log(
        `[TweetFetch] Task "${job.id}" (${data.type}) claimed by ${INSTANCE_ID}`
      );
      if (data.type === "category") {
        await fetchAndStoreTweets([data.category]);
      } else {
        await fetchAndStoreTweetsForProfiles([data.profile]);
      }
    },
    { connection, concurrency: 5 }
  );
  tweetFetchTaskWorker.on("failed", (job, error) => {
    console.error(`[TweetFetch] Task "${job?.id}" failed:`, error);
  });
}

export function getTweetFetchWorkers(): Worker[] {
  return [tweetFetchWorker, tweetFetchTaskWorker].filter(Boolean);
}
