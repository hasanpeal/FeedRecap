import moment from "moment-timezone";
import { User } from "../models/userModel";
import {
  fetchAndStoreTweets,
  fetchAndStoreTweetsForProfiles,
} from "../services/twitterService";
import { runIfLeader } from "./jobLock";
import { logSystemActivity, ActivityType } from "../services/auditLogger";

// Runs one full tweet-fetch cycle (categories + custom profiles). Only ever
// invoked through `runIfLeader` so that when multiple server replicas are
// running, exactly one of them hits the Twitter API per hour instead of
// every replica fetching (and rate-limiting itself) in parallel.
async function runTweetFetchCycle(): Promise<void> {
  console.log(
    "🔄 [Tweet Fetching]: Fetching fresh tweets for all categories..."
  );

  // Process categories sequentially (one at a time)
  const categories: string[] = [
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

  try {
    await fetchAndStoreTweets(categories);
  } catch (error) {
    console.error(
      `❌ [Error] Fetching tweets for category "${categories}" failed:`,
      error
    );
  }

  console.log("✅ [Tweet Fetching]: All categories updated successfully.");

  console.log(
    "🔄 [Custom Profiles]: Fetching fresh posts for user profiles..."
  );

  // Fetch all users with custom profiles
  const users = await User.find({ wise: "customProfiles" }).exec();

  // Extract unique profiles from all users
  const uniqueProfiles = new Set<string>();
  for (const user of users) {
    user.profiles.forEach((profile: string) => uniqueProfiles.add(profile));
  }

  const profilesArray: string[] = Array.from(uniqueProfiles);
  console.log(
    `📋 [Custom Profiles]: Found ${profilesArray.length} unique profiles.`
  );

  // Process 5 profiles at a time with error handling
  const PROFILE_BATCH_SIZE = 5;
  for (let i = 0; i < profilesArray.length; i += PROFILE_BATCH_SIZE) {
    const batch: string[] = profilesArray.slice(i, i + PROFILE_BATCH_SIZE);
    console.log(
      `🚀 [Custom Profiles]: Fetching batch ${i / PROFILE_BATCH_SIZE + 1}...`
    );

    // Store failed profiles
    let failedProfiles: string[] = [];

    // Attempt to fetch profiles
    const results = await Promise.allSettled([
      fetchAndStoreTweetsForProfiles(batch),
    ]);

    // Check for failed requests
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `❌ [Error] Fetching tweets failed for profiles: ${batch}`,
          result.reason
        );
        failedProfiles.push(...batch);
      }
    });

    // Wait 1 second before starting the next batch
    if (i + PROFILE_BATCH_SIZE < profilesArray.length) {
      console.log(`⏳ [Custom Profiles]: Waiting 1s before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Retry fetching failed profiles once
    if (failedProfiles.length > 0) {
      console.log(
        `🔄 [Retry]: Retrying failed profiles: ${failedProfiles.join(", ")}`
      );

      const retryResults = await Promise.allSettled([
        fetchAndStoreTweetsForProfiles(failedProfiles),
      ]);

      retryResults.forEach((retryResult) => {
        if (retryResult.status === "rejected") {
          console.error(
            `❌ [Final Error] Retrying failed for profiles: ${failedProfiles}`,
            retryResult.reason
          );
        }
      });

      console.log(`✅ [Retry]: Completed retry attempt.`);
    }
  }

  console.log("✅ [Custom Profiles]: User profile tweets updated.");
}

async function fetchTweetsPeriodically() {
  while (true) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Skip execution at 9 AM, 3 PM, and 8 PM
    if ([9, 15, 20].includes(hours)) {
      console.log(`⏸️ [Tweet Fetching]: Skipped execution at ${hours}:00`);
    } else if (minutes % 60 === 0) {
      // One lock per hour: whichever replica gets here first for this hour
      // runs the fetch cycle, the rest skip it.
      const jobKey = `tweets:${moment()
        .tz("America/New_York")
        .format("YYYY-MM-DD-HH")}`;

      try {
        const ran = await runIfLeader(jobKey, runTweetFetchCycle);
        if (ran) {
          await logSystemActivity({
            activityType: ActivityType.TWEET_FETCH_COMPLETED,
            activityDescription: `Tweet fetch cycle completed for ${jobKey}`,
          });
        }
      } catch (error) {
        console.error(`❌ [Error] Tweet fetch cycle "${jobKey}" failed:`, error);
        await logSystemActivity({
          activityType: ActivityType.TWEET_FETCH_FAILED,
          activityDescription: `Tweet fetch cycle failed for ${jobKey}`,
          metadata: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }

    // Wait 1 minute before checking again
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  }
}

export function startTweetFetchJob(): void {
  fetchTweetsPeriodically().catch(console.error);
}
