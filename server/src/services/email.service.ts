import sgMail from "@sendgrid/mail";
import "../config/env";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export default sgMail;

// The three recipients that get pinged on every new signup / weekly digest.
export const ADMIN_ALERT_RECIPIENTS = [
  "pealh0320@gmail.com",
  "jeremy.shoykhet+1@gmail.com",
  "support@overtonnews.com",
];

// Sends the same alert to each recipient independently, so one bad address
// doesn't stop the others from getting theirs.
export async function sendAdminAlert(
  recipients: string[],
  subject: string,
  text: string
): Promise<void> {
  for (const to of recipients) {
    try {
      await sgMail.send({
        to,
        from: process.env.FROM_EMAIL || "",
        subject,
        text,
      });
    } catch (error) {
      console.error(`[Email] Failed to send admin alert to ${to}:`, error);
    }
  }
}


export const CRITICAL_ALERT_RECIPIENT = "pealh0320@gmail.com";

export async function sendCriticalSystemAlert(
  source: string,
  error: unknown,
  context?: string
): Promise<void> {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  const details = [
    "A critical FeedRecap system failure requires attention.",
    `Source: ${source}`,
    `Environment: ${process.env.NODE_ENV || "development"}`,
    `Time: ${new Date().toISOString()}`,
    context ? `Context: ${context}` : null,
    "",
    message,
  ].filter((line): line is string => line !== null).join("\n");

  await sendAdminAlert(
    [CRITICAL_ALERT_RECIPIENT],
    `[FeedRecap Critical] ${source}`,
    details
  );
}
