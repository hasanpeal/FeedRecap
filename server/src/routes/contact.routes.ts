import express from "express";
import { authenticateJWT } from "../middleware/auth.middleware";
import sgMail from "../services/email.service";
import { logActivity, ActivityType } from "../services/auditLog.service";

const router = express.Router();

const SUPPORT_EMAIL = "pealh0320@gmail.com";

// JWT-protected contact/feedback endpoint
router.post("/contact", authenticateJWT, async (req, res) => {
  const userFromToken = req.user!;
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ code: 1, message: "Message is required" });
  }

  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    console.error("[Contact] FROM_EMAIL is not set in environment");
    return res
      .status(500)
      .json({ code: 1, message: "Server email not configured" });
  }

  try {
    await sgMail.send({
      to: SUPPORT_EMAIL,
      from: fromEmail,
      subject: `FeedRecap Contact Form: ${userFromToken.email}`,
      text: `From: ${userFromToken.email}\n\n${message}`,
      html: `<p><strong>From:</strong> ${userFromToken.email}</p><p>${message}</p>`,
    });

    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.FEEDBACK_SENT,
      activityDescription: `Contact form submitted by ${userFromToken.email}`,
    });

    return res.status(200).json({ code: 0, message: "Message sent" });
  } catch (err) {
    console.error("[Contact] Error sending contact email:", err);
    return res.status(500).json({ code: 1, message: "Error sending email" });
  }
});

export default router;
