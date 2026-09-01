import sgMail from "@sendgrid/mail";
import mongoose from "mongoose";
import { IUser } from "../models/userModel";
import { Newsletter } from "../models/newsletterModel";
import { logSystemActivity, ActivityType } from "./auditLogger";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// Single source of truth for who gets internal admin alerts.
export const ADMIN_EMAILS = {
  owner: "pealh0320@gmail.com",
  team: "jeremy.shoykhet+1@gmail.com",
  support: "support@overtonnews.com",
};

/**
 * Sends the same admin notification to one or more internal recipients.
 * Each send is independent: one recipient failing (e.g. a bad address)
 * doesn't stop the others from receiving it.
 */
export async function sendAdminAlert(
  subject: string,
  text: string,
  recipients: string[]
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
      console.error(`❌ [Error]: Error sending admin alert to ${to}:`, error);
    }
  }
}

export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ success: boolean }> {
  try {
    await sgMail.send({
      to: email,
      from: process.env.FROM_EMAIL || "",
      subject: "Your FeedRecap OTP Code is here",
      text: `Your OTP code is ${otp}`,
      html: `<strong> Your OTP code is ${otp}</strong>`,
    });
    return { success: true };
  } catch (err) {
    console.log("Error sending OTP email on /sentOTP route");
    return { success: false };
  }
}

export async function sendNewsletterEmail(
  user: IUser,
  newsletter: string
): Promise<void> {
  // Save the newsletter
  const newNewsletter = new Newsletter({
    user: user._id,
    content: newsletter,
  });
  const savedNewsletter = await newNewsletter.save();

  // Short link for the newsletter
  const shortLink = `${process.env.ORIGIN}/readnewsletter?newsletter=${savedNewsletter._id}`;
  // Construct Share on X URL
  const shareText = encodeURIComponent(
    `📢 Read today's newsletter at FeedRecap! 🚀\n\n${shortLink}`
  );
  const shareOnXLink = `https://twitter.com/intent/tweet?text=${shareText}`;

  // X Mobile Deep Link (opens in X app if installed)
  const shareOnXMobile = `twitter://post?message=${shareText}`;
  // Unsubscribe link
  const unsubscribeLink = `${
    process.env.ORIGIN
  }/unsubscribe?email=${encodeURIComponent(user.email)}`;

  const emailTemplate = `
<div style="color: #333; font-family: Verdana, sans-serif; margin: auto; border-radius: 12px; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);">
      <!-- Newsletter Content -->
      <div style="background: white; border-radius: 10px; margin-top: 20px; font-size: 16px; line-height: 1.6; color: #333; box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.05);">
        ${newsletter}
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #666;">Share it with your friends 📲</p>
        <a href="${shortLink}"
          style="background: #00A8E8; color: #000; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 10px; transition: all 0.3s ease-in-out;">
          📩 Read & Share
        </a>
      </div>

      <!-- Share on X -->
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #666;">Spread the word on X</p>
    <a href="${shareOnXLink}"
      onclick="event.preventDefault(); if(navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/i)){ window.location.href='${shareOnXMobile}'; setTimeout(() => { window.location.href='${shareOnXLink}'; }, 1000); } else { window.location.href='${shareOnXLink}'; }"
      style="background: #00A8E8; color: #000; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; margin-top: 10px; transition: all 0.3s ease-in-out;">
      Share on X
    </a>
  </div>

      <!-- Divider -->
      <hr style="margin: 30px 0; border: 0.5px solid #DDD;">

      <!-- Unsubscribe -->
      <div style="text-align: center; font-size: 14px; color: #777; margin-top: 20px;">
        <p><a href="${unsubscribeLink}" style="color: #00A8E8; text-decoration: none;">Click here to unsubscribe</a></p>
      </div>

      <!-- Social Media Footer -->
      <div style="text-align: center; font-size: 14px; color: #777; margin-top: 20px;">
        <p>Stay updated on</p>
        <a href="https://x.com/FeedRecap" style="color: #00A8E8; text-decoration: none; margin: 0 10px;"> X </a> |
        <a href="https://feedrecap.com" style="color: #00A8E8; text-decoration: none; margin: 0 10px;"> FeedRecap </a>
        <p style="margin-top: 20px;">© 2025 FeedRecap. All Rights Reserved</p>
      </div>
    </div>
  `;

  const msg = {
    to: user.email,
    from: {
      email: process.env.FROM_EMAIL || "",
      name: "FeedRecap",
    },
    subject: "Your FeedRecap Newsletter Just Landed!",
    html: emailTemplate,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ [Email Sent]: Newsletter sent to ${user.email}`);

    // Save the generated newsletter in the user's document
    user.newsletter = newsletter;
    user.totalnewsletter = (user.totalnewsletter || 0) + 1;
    await user.save();

    await logSystemActivity({
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      activityType: ActivityType.NEWSLETTER_SENT,
      activityDescription: `Newsletter sent to ${user.email}`,
      metadata: {
        newsletterId: (savedNewsletter._id as mongoose.Types.ObjectId).toString(),
      },
    });
  } catch (error) {
    console.error(`❌ [Error]: Error sending email to ${user.email}:`, error);
    await logSystemActivity({
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      activityType: ActivityType.NEWSLETTER_SEND_FAILED,
      activityDescription: `Failed to send newsletter to ${user.email}`,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}
