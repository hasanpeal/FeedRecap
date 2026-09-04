import mongoose from "mongoose";
import { Worker } from "bullmq";
import moment from "moment-timezone";
import connection from "../config/redis";
import { User, IUser } from "../models/user.model";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  getStoredTweetsForUser,
  generateCustomProfileNewsletter,
  sendNewsletterEmail,
  isValidEmail,
} from "../services/newsletter.service";
import { INSTANCE_ID } from "./instanceId";
import {
  newsletterQueue,
  newsletterTaskQueue,
  QUEUE_NAMES,
} from "./queues";

// Generates and sends the newsletter for exactly one user. Only ever called
// from the per-user task Worker below. Errors are allowed to propagate so
// BullMQ retries this one user's task instead of the old silent
// catch-and-move-on (which meant a transient failure just meant no email,
// with no retry).
async function processNewsletterForUser(
  user: IUser,
  timeSlot: string
): Promise<void> {
  console.log(`[Newsletter] Generating newsletter for ${user.email}`);

  let newsletter = null;
  if (user.wise === "categorywise") {
    const { tweetsByCategory, top15Tweets } = await fetchTweetsForCategories(
      user.categories
    );
    newsletter = await generateNewsletter(tweetsByCategory, top15Tweets);
  } else if (user.wise === "customProfiles") {
    const { tweetsByProfiles, top15Tweets } = await getStoredTweetsForUser(
      user._id as mongoose.Types.ObjectId
    );
    newsletter = await generateCustomProfileNewsletter(
      tweetsByProfiles,
      top15Tweets
    );
  }

  if (newsletter) {
    await sendNewsletterEmail(user, newsletter);
    console.log(`[Newsletter] Sent to ${user.email}`);
  }
}

// Dispatcher: runs once per time slot, on whichever replica's Worker claims
// the scheduled occurrence. Fans the actual sends out into one task per
// user instead of doing them all here, so every replica's task Worker can
// pick tasks up and send concurrently. Deterministic jobIds (keyed by
// today's date + user) make re-dispatching idempotent — if this dispatch
// job gets retried/reclaimed, re-adding the same task jobIds is a no-op
// rather than double-emailing.
async function dispatchNewsletterTasks(timeSlot: string): Promise<void> {
  const users = await User.find({ time: timeSlot }).exec();
  if (users.length === 0) {
    console.log(`[Newsletter] No users found for time slot ${timeSlot}`);
    return;
  }

  const dateStr = moment().tz("America/New_York").format("YYYY-MM-DD");
  let dispatched = 0;

  for (const user of users) {
    if (!isValidEmail(user.email)) {
      console.warn(`[Newsletter] Skipping user with invalid email: ${user.email}`);
      continue;
    }
    if (!user.time || user.time.length === 0) {
      console.warn(
        `[Newsletter] Skipping user with no time preferences: ${user.email}`
      );
      continue;
    }

    await newsletterTaskQueue.add(
      "send-newsletter",
      { userId: (user._id as mongoose.Types.ObjectId).toString(), timeSlot },
      { jobId: `newsletter-${timeSlot}-${dateStr}-${user._id}` }
    );
    dispatched++;
  }

  console.log(
    `[Newsletter] Dispatched ${dispatched} newsletter tasks for time slot ${timeSlot}`
  );
}

const NEWSLETTER_SCHEDULES: { id: string; timeSlot: string; pattern: string }[] = [
  { id: "newsletter:Morning", timeSlot: "Morning", pattern: "0 9 * * *" },
  { id: "newsletter:Afternoon", timeSlot: "Afternoon", pattern: "0 15 * * *" },
  { id: "newsletter:Night", timeSlot: "Night", pattern: "0 20 * * *" },
];

let newsletterWorker: Worker;
let newsletterTaskWorker: Worker;

export async function startNewsletterScheduler(): Promise<void> {
  for (const { id, timeSlot, pattern } of NEWSLETTER_SCHEDULES) {
    await newsletterQueue.upsertJobScheduler(
      id,
      { pattern, tz: "America/New_York" },
      { name: "send-newsletter-batch", data: { timeSlot } }
    );
  }

  newsletterWorker = new Worker(
    QUEUE_NAMES.NEWSLETTER,
    async (job) => {
      console.log(
        `[Newsletter] Dispatch claimed by ${INSTANCE_ID} for time slot ${job.data.timeSlot}`
      );
      await dispatchNewsletterTasks(job.data.timeSlot);
    },
    { connection, concurrency: 1 }
  );
  newsletterWorker.on("failed", (job, error) => {
    console.error(`[Newsletter] Dispatch job "${job?.id}" failed:`, error);
  });

  // Every replica runs one of these workers, listening on the same task
  // queue, so sends get pulled by whichever replica is free — actual load
  // spread across all replicas instead of one replica emailing everyone.
  newsletterTaskWorker = new Worker(
    QUEUE_NAMES.NEWSLETTER_TASK,
    async (job) => {
      const user = await User.findById(job.data.userId).exec();
      if (!user) {
        console.warn(
          `[Newsletter] User ${job.data.userId} no longer exists, skipping task "${job.id}"`
        );
        return;
      }
      console.log(
        `[Newsletter] Task "${job.id}" claimed by ${INSTANCE_ID}`
      );
      await processNewsletterForUser(user, job.data.timeSlot);
    },
    { connection, concurrency: 5 }
  );
  newsletterTaskWorker.on("failed", (job, error) => {
    console.error(`[Newsletter] Task "${job?.id}" failed:`, error);
  });
}

export function getNewsletterWorkers(): Worker[] {
  return [newsletterWorker, newsletterTaskWorker].filter(Boolean);
}
