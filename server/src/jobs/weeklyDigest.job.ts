import { Worker } from "bullmq";
import connection from "../config/redis";
import { User } from "../models/user.model";
import { ADMIN_ALERT_RECIPIENTS, sendAdminAlert } from "../services/email.service";
import { INSTANCE_ID } from "./instanceId";
import { weeklyDigestQueue, QUEUE_NAMES } from "./queues";

const sendDigest = async () => {
  const totalUsers = await User.countDocuments({});

  // Example message for the digest
  const digestMessage = `As of now, we have a total of ${totalUsers} users in the system.`;

  await sendAdminAlert(
    ADMIN_ALERT_RECIPIENTS,
    `Automated FeedRecap's total user count update`,
    digestMessage
  );
};

// Run the task once a week on Monday at 9 AM Eastern
let weeklyDigestWorker: Worker;

export async function startWeeklyDigestJob(): Promise<void> {
  await weeklyDigestQueue.upsertJobScheduler(
    "weekly-digest:monday",
    { pattern: "0 9 * * 1", tz: "America/New_York" },
    { name: "send-weekly-digest" }
  );

  weeklyDigestWorker = new Worker(
    QUEUE_NAMES.WEEKLY_DIGEST,
    async () => {
      console.log(`🎯 [Weekly Digest]: Claimed by ${INSTANCE_ID}`);
      await sendDigest();
    },
    { connection, concurrency: 1 }
  );

  weeklyDigestWorker.on("failed", (job, error) => {
    console.error(`❌ [Error]: Weekly digest job "${job?.id}" failed:`, error);
  });
}

export function getWeeklyDigestWorkers(): Worker[] {
  return [weeklyDigestWorker].filter(Boolean);
}
