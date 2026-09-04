import express from "express";
import { User } from "../models/user.model";
import { AuditLog } from "../models/auditLog.model";
import { authenticateAdmin } from "../middleware/auth.middleware";
import { ActivityType } from "../services/auditLog.service";
import { getStartDateForPeriod } from "../utils/dateRange.util";

const router = express.Router();

// Get page views analytics
router.get("/admin/analytics/pageviews", authenticateAdmin, async (req, res) => {
  try {
    const { period, page } = req.query;
    const startDate = getStartDateForPeriod(period);

    const query: any = {
      activityType: ActivityType.PAGE_VISIT,
      createdAt: { $gte: startDate },
    };

    if (page) {
      query.page = page;
    }

    const pageViews = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .select("page createdAt email")
      .lean();

    // Group by date and page
    const grouped: { [key: string]: { [page: string]: number } } = {};
    pageViews.forEach((log: any) => {
      const date = new Date(log.createdAt).toISOString().split("T")[0];
      const pageName = log.page || "unknown";
      if (!grouped[date]) {
        grouped[date] = {};
      }
      grouped[date][pageName] = (grouped[date][pageName] || 0) + 1;
    });

    const totalViews = pageViews.length;
    const uniquePages = new Set(pageViews.map((log: any) => log.page)).size;

    res.status(200).json({
      code: 0,
      data: {
        totalViews,
        uniquePages,
        grouped,
        pageViews: pageViews.slice(0, 100), // Last 100 page views
      },
    });
  } catch (error) {
    console.error("Error fetching page views:", error);
    res.status(500).json({ code: 1, message: "Error fetching analytics" });
  }
});

// Get link clicks analytics
router.get("/admin/analytics/linkclicks", authenticateAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    const startDate = getStartDateForPeriod(period);

    const linkClicks = await AuditLog.find({
      activityType: ActivityType.LINK_CLICKED,
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: -1 })
      .select("metadata createdAt email")
      .lean();

    const totalClicks = linkClicks.length;
    const linkStats: { [link: string]: number } = {};
    linkClicks.forEach((log: any) => {
      const link = log.metadata?.link || "unknown";
      linkStats[link] = (linkStats[link] || 0) + 1;
    });

    res.status(200).json({
      code: 0,
      data: {
        totalClicks,
        linkStats,
        clicks: linkClicks.slice(0, 100),
      },
    });
  } catch (error) {
    console.error("Error fetching link clicks:", error);
    res.status(500).json({ code: 1, message: "Error fetching analytics" });
  }
});

// Get all audit logs (live activities)
router.get("/admin/audit-logs", authenticateAdmin, async (req, res) => {
  try {
    const { userEmail, activityType, limit = 100, skip = 0 } = req.query;

    const query: any = {};
    if (userEmail) {
      query.email = userEmail;
    }
    if (activityType) {
      query.activityType = activityType;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .select("email activityType activityDescription page metadata createdAt")
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      code: 0,
      data: {
        logs,
        total,
        limit: Number(limit),
        skip: Number(skip),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ code: 1, message: "Error fetching audit logs" });
  }
});

// Get user metrics
router.get("/admin/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select("email wise categories profiles twitterUsername isAdmin")
      .sort({ createdAt: -1 })
      .lean();

    const userStats = {
      total: users.length,
      categorywise: users.filter((u: any) => u.wise === "categorywise").length,
      customProfiles: users.filter((u: any) => u.wise === "customProfiles")
        .length,
      withTwitter: users.filter((u: any) => u.twitterUsername).length,
    };

    res.status(200).json({
      code: 0,
      data: {
        users,
        stats: userStats,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ code: 1, message: "Error fetching users" });
  }
});

// Get activity statistics
router.get("/admin/analytics/activities", authenticateAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    const startDate = getStartDateForPeriod(period);

    const activities = await AuditLog.find({
      createdAt: { $gte: startDate },
    })
      .select("activityType createdAt")
      .lean();

    const activityStats: { [type: string]: number } = {};
    activities.forEach((log: any) => {
      activityStats[log.activityType] =
        (activityStats[log.activityType] || 0) + 1;
    });

    res.status(200).json({
      code: 0,
      data: {
        totalActivities: activities.length,
        activityStats,
        period,
      },
    });
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    res.status(500).json({ code: 1, message: "Error fetching activity stats" });
  }
});

export default router;
