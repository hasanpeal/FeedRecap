import cron from "node-cron";
import moment from "moment-timezone";
import { User } from "../models/userModel";
import { sendAdminAlert, ADMIN_EMAILS } from "../services/emailService";
import { runIfLeader } from "./jobLock";
import { logSystemActivity, ActivityType } from "../services/auditLogger";

const sendDigest = async () => {
  const totalUsers = await User.countDocuments({});
  const digestMessage = `As of now, we have a total of ${totalUsers} users in the system.`;

  await sendAdminAlert(
    `Automated FeedRecap's total user count update`,
    digestMessage,
    [ADMIN_EMAILS.team, ADMIN_EMAILS.owner, ADMIN_EMAILS.support]
  );

  await logSystemActivity({
    activityType: ActivityType.WEEKLY_DIGEST_SENT,
    activityDescription: "Weekly admin digest sent",
    metadata: { totalUsers },
  });
};

export function startWeeklyDigestJob(): void {
  // Run once a week on Monday at 9 AM. Only one replica actually sends it,
  // keyed by ISO week so re-runs within the same week are a no-op.
  cron.schedule("0 9 * * 1", async () => {
    const jobKey = `weekly-digest:${moment()
      .tz("America/New_York")
      .format("GGGG-[W]WW")}`;
    try {
      await runIfLeader(jobKey, sendDigest);
    } catch (error) {
      console.error(`❌ [Error]: Weekly digest job "${jobKey}" failed:`, error);
    }
  });
}
