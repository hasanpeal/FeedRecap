import mongoose from "mongoose";
import moment from "moment-timezone";
import { User } from "../models/userModel";
import {
  fetchTweetsForCategories,
  getStoredTweetsForUser,
} from "../services/twitterService";
import {
  generateNewsletter,
  generateCustomProfileNewsletter,
} from "../services/newsletterService";
import { sendNewsletterEmail } from "../services/emailService";
import { runIfLeader } from "./jobLock";
import { logSystemActivity, ActivityType } from "../services/auditLogger";

const NUM_PARALLEL = 5;

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sends the newsletter batch for one time slot (Morning/Afternoon/Night) to
// every user subscribed to it. Only called through `runIfLeader`.
async function processNewslettersForTimeSlot(timeSlot: string): Promise<void> {
  console.log(`⏰ [Debug] Processing newsletters for time slot: ${timeSlot}`);
  try {
    const users = await User.find({ time: timeSlot }).exec();
    if (users.length === 0) {
      console.log(`📭 [Debug] No users found for time slot: ${timeSlot}`);
      return;
    }

    console.log(
      `📋 [Debug] Found ${users.length} users for time slot: ${timeSlot}`
    );

    await logSystemActivity({
      activityType: ActivityType.NEWSLETTER_BATCH_STARTED,
      activityDescription: `Started ${timeSlot} newsletter batch for ${users.length} users`,
      metadata: { timeSlot, userCount: users.length },
    });

    // Process users in batches of 5 parallel requests
    for (let i = 0; i < users.length; i += NUM_PARALLEL) {
      const batch = users.slice(i, i + NUM_PARALLEL);

      await Promise.all(
        batch.map(async (user) => {
          try {
            if (!isValidEmail(user.email)) {
              console.log(
                `⚠️ [Debug] Skipping user with invalid email: ${user.email}`
              );
              return;
            }

            if (!user.time || user.time.length === 0) {
              console.log(
                `⚠️ [Debug] Skipping user with no time preferences: ${user.email}`
              );
              return;
            }

            console.log(`📧 [Debug] Generating newsletter for: ${user.email}`);

            let newsletter = null;
            if (user.wise === "categorywise") {
              const { tweetsByCategory, top15Tweets } =
                await fetchTweetsForCategories(user.categories);
              newsletter = await generateNewsletter(
                tweetsByCategory,
                top15Tweets
              );
            } else if (user.wise === "customProfiles") {
              const { tweetsByProfiles, top15Tweets } =
                await getStoredTweetsForUser(
                  user._id as mongoose.Types.ObjectId
                );
              newsletter = await generateCustomProfileNewsletter(
                tweetsByProfiles,
                top15Tweets
              );
            }

            if (newsletter) {
              await sendNewsletterEmail(user, newsletter);
              console.log(`✅ [Debug] Newsletter sent to: ${user.email}`);
            }
          } catch (error) {
            console.error(
              `❌ [Debug] Error processing newsletter for ${user.email}:`,
              error
            );
          }
        })
      );
    }
    console.log(
      `✅ [Debug] Completed newsletter processing for time slot: ${timeSlot}`
    );
    await logSystemActivity({
      activityType: ActivityType.NEWSLETTER_BATCH_COMPLETED,
      activityDescription: `Completed ${timeSlot} newsletter batch for ${users.length} users`,
      metadata: { timeSlot, userCount: users.length },
    });
  } catch (error) {
    console.error(
      `❌ [Debug] Error processing newsletters for time slot: ${timeSlot}`,
      error
    );
    throw error;
  }
}

export function startNewsletterScheduler(): void {
  const scheduleTimes = {
    Morning: "09:00", // 9 AM Eastern
    Afternoon: "15:00", // 3 PM Eastern
    Night: "20:00", // 8 PM Eastern
  };

  setInterval(async () => {
    const currentMoment = moment().tz("America/New_York");
    const currentTime = currentMoment.format("HH:mm");
    const dateStr = currentMoment.format("YYYY-MM-DD");

    for (const [timeSlot, scheduledTime] of Object.entries(scheduleTimes)) {
      if (currentTime === scheduledTime) {
        // One lock per time slot per day: only the replica that wins the
        // lock sends this batch, the others skip it. This is what stops
        // every replica from independently sending the same newsletter.
        const jobKey = `newsletter:${timeSlot}:${dateStr}`;
        console.log(
          `🎯 [Debug] Time matched for ${timeSlot}. Attempting to claim job "${jobKey}"...`
        );

        try {
          const ran = await runIfLeader(jobKey, () =>
            processNewslettersForTimeSlot(timeSlot)
          );
          if (!ran) {
            console.log(
              `⏭️ [Debug] Job "${jobKey}" already claimed by another replica, skipping.`
            );
            await logSystemActivity({
              activityType: ActivityType.SCHEDULED_JOB_SKIPPED,
              activityDescription: `Skipped ${timeSlot} newsletter batch, already handled by another replica`,
              metadata: { jobKey, timeSlot },
            });
          }
        } catch (error) {
          console.error(`❌ [Debug] Newsletter batch job "${jobKey}" failed:`, error);
        }
      }
    }
  }, 60 * 1000); // Check every minute
}
