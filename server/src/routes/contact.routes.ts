import express from "express";
import { authenticateJWT } from "../middleware/auth.middleware";
import sgMail from "../services/email.service";
import { logActivity, ActivityType } from "../services/auditLog.service";

const router = express.Router();

// JWT-protected contact endpoint
router.post("/contact", authenticateJWT, async (req, res) => {
  const userFromToken = req.user!;
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ code: 1, message: "Name, email and message are required" });
  }

  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    console.error("FROM_EMAIL is not set in environment");
    return res.status(500).json({ code: 1, message: "Server email not configured" });
  }

  const mail = {
    to: "pealh0320@gmail.com",
    from: fromEmail,
    subject: `FeedRecap Contact Form: ${name}`,
    text: `From: ${email}\nUser (token): ${userFromToken.email}\n\n${message}`,
    html: `<p><strong>From:</strong> ${email}</p><p><strong>User (token):</strong> ${userFromToken.email}</p><p>${message}</p>`,
  } as any;

  try {
    await sgMail.send(mail);

    // Log activity
    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.FEEDBACK_SENT,
      activityDescription: `Contact form submitted by ${userFromToken.email}`,
      metadata: { name, from: email },
    });

    return res.status(200).json({ code: 0, message: "Message sent" });
  } catch (err) {
    console.error("Error sending contact email:", err);
    return res.status(500).json({ code: 1, message: "Error sending email" });
  }
});

export default router;
