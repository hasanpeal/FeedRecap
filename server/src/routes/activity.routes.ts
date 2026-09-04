import express from "express";
import { authenticateJWT } from "../middleware/auth.middleware";
import { logActivity, ActivityType } from "../services/auditLog.service";

const router = express.Router();

// API endpoint to log page visits from frontend
router.post("/logPageVisit", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;
    const { page } = req.body;

    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.PAGE_VISIT,
      activityDescription: `Visited ${page}`,
      page: page || "unknown",
    });

    res.status(200).json({ code: 0, message: "Page visit logged" });
  } catch (error) {
    console.error("[Activity] Error logging page visit:", error);
    res.status(500).json({ code: 1, message: "Error logging page visit" });
  }
});

// Log link click endpoint
router.post("/logLinkClick", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;
    const { link, page } = req.body;

    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.LINK_CLICKED,
      activityDescription: `Clicked link: ${link}`,
      page: page || "unknown",
      metadata: { link },
    });

    res.status(200).json({ code: 0, message: "Link click logged" });
  } catch (error) {
    console.error("[Activity] Error logging link click:", error);
    res.status(500).json({ code: 1, message: "Error logging link click" });
  }
});

// Log feedback endpoint
router.post("/logFeedback", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;
    const { feedback, subject } = req.body;

    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.FEEDBACK_SENT,
      activityDescription: `Feedback sent: ${subject || "No subject"}`,
      metadata: { feedback, subject },
    });

    res.status(200).json({ code: 0, message: "Feedback logged" });
  } catch (error) {
    console.error("[Activity] Error logging feedback:", error);
    res.status(500).json({ code: 1, message: "Error logging feedback" });
  }
});

export default router;
