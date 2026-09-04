import express from "express";
import { Newsletter } from "../models/newsletter.model";
import { verifyJWT } from "../services/auth.service";
import { logActivity, ActivityType } from "../services/auditLog.service";

const router = express.Router();

router.get("/newsletter/:id", async (req, res) => {
  try {
    const newsletter = await Newsletter.findById(req.params.id);
    if (!newsletter) return res.status(404).send("Newsletter not found");

    // Log newsletter view if user is authenticated
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.startsWith("Bearer ")
          ? req.headers.authorization.substring(7)
          : req.headers.authorization;
        const decoded = verifyJWT(token);
        await logActivity(req, {
          userId: decoded.userId,
          email: decoded.email,
          activityType: ActivityType.NEWSLETTER_VIEWED,
          activityDescription: `Viewed newsletter: ${req.params.id}`,
          metadata: { newsletterId: req.params.id },
        });
      } catch (error) {
        // Not authenticated, skip logging
      }
    }

    return res.status(200).json({ code: 0, newsletter: newsletter.content });
  } catch (error) {
    console.error("Error fetching newsletter:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
