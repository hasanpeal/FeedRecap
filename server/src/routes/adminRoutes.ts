import express from "express";
import { User } from "../models/userModel";
import { AuditLog } from "../models/auditLogModel";
import { Newsletter } from "../models/newsletterModel";
import { StoredTweets, CustomProfilePosts } from "../models/tweetModel";
import { JobLock } from "../models/jobLockModel";
import { ActivityType } from "../services/auditLogger";
import { authenticateAdmin } from "../middleware/auth";

const router = express.Router();

// All routes in this router require admin auth.
router.use(authenticateAdmin);

function startDateForPeriod(period: unknown): Date {
  const startDate = new Date();
  switch (period) {
    case "1d":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "3d":
      startDate.setDate(startDate.getDate() - 3);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      // AuditLog retention is 90 days (see models/auditLogModel.ts), so this
      // is the longest period that can ever return complete data.
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }
  return startDate;
}

// Get page views analytics
router.get("/analytics/pageviews", async (req, res) => {
  try {
    const { period, page } = req.query;
    const startDate = startDateForPeriod(period);

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
router.get("/analytics/linkclicks", async (req, res) => {
  try {
    const { period } = req.query;
    const startDate = startDateForPeriod(period);

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
router.get("/audit-logs", async (req, res) => {
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
router.get("/users", async (req, res) => {
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
router.get("/analytics/activities", async (req, res) => {
  try {
    const { period } = req.query;
    const startDate = startDateForPeriod(period);

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

// Content insights: what's actually being tracked and how it's performing.
// StoredTweets (fixed category accounts) lives on the tweets cluster;
// CustomProfilePosts lives on the user cluster alongside User — they're
// combined here in application code since a $lookup can't cross clusters.
router.get("/insights/content", async (req, res) => {
  try {
    const [categoryDocs, profileDocs, followerCounts] = await Promise.all([
      StoredTweets.find({})
        .select("category screenName tweets createdAt")
        .lean(),
      CustomProfilePosts.find({}).select("screenName tweets createdAt").lean(),
      User.aggregate([
        { $unwind: "$profiles" },
        { $group: { _id: "$profiles", followers: { $sum: 1 } } },
        { $sort: { followers: -1 } },
      ]),
    ]);

    const sumLikes = (tweets: { likes: number }[]) =>
      tweets.reduce((sum, t) => sum + (t.likes || 0), 0);

    // Per-category rollup (accounts tracked, tweets stored, total likes, freshness)
    const categoryMap: {
      [category: string]: {
        category: string;
        accounts: number;
        totalTweets: number;
        totalLikes: number;
        lastUpdated: Date;
      };
    } = {};
    for (const doc of categoryDocs as any[]) {
      const entry = categoryMap[doc.category] || {
        category: doc.category,
        accounts: 0,
        totalTweets: 0,
        totalLikes: 0,
        lastUpdated: doc.createdAt,
      };
      entry.accounts += 1;
      entry.totalTweets += doc.tweets.length;
      entry.totalLikes += sumLikes(doc.tweets);
      if (doc.createdAt > entry.lastUpdated) entry.lastUpdated = doc.createdAt;
      categoryMap[doc.category] = entry;
    }
    const categoryBreakdown = Object.values(categoryMap).sort(
      (a, b) => b.totalLikes - a.totalLikes
    );

    // Combined top-accounts leaderboard across category accounts + custom profiles
    const categoryAccounts = (categoryDocs as any[]).map((doc) => ({
      screenName: doc.screenName,
      source: doc.category,
      totalLikes: sumLikes(doc.tweets),
      tweetCount: doc.tweets.length,
      lastUpdated: doc.createdAt,
    }));
    const customAccounts = (profileDocs as any[]).map((doc) => ({
      screenName: doc.screenName,
      source: "Custom",
      totalLikes: sumLikes(doc.tweets),
      tweetCount: doc.tweets.length,
      lastUpdated: doc.createdAt,
    }));
    const topAccounts = [...categoryAccounts, ...customAccounts]
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 10);

    // Most-followed custom profiles (by how many users follow them)
    const profileByScreenName = new Map(
      (profileDocs as any[]).map((doc) => [doc.screenName, doc])
    );
    const mostFollowedProfiles = followerCounts.slice(0, 10).map((f: any) => {
      const doc = profileByScreenName.get(f._id);
      return {
        screenName: f._id,
        followers: f.followers,
        totalLikes: doc ? sumLikes(doc.tweets) : 0,
        lastUpdated: doc?.createdAt || null,
      };
    });

    const allTimestamps = [
      ...categoryDocs.map((d: any) => d.createdAt),
      ...profileDocs.map((d: any) => d.createdAt),
    ];

    res.status(200).json({
      code: 0,
      data: {
        trackedCategoryAccounts: categoryDocs.length,
        trackedCustomProfiles: profileDocs.length,
        categoryBreakdown,
        topAccounts,
        mostFollowedProfiles,
        lastFetchAt: allTimestamps.length
          ? new Date(Math.max(...allTimestamps.map((d) => +new Date(d))))
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching content insights:", error);
    res.status(500).json({ code: 1, message: "Error fetching content insights" });
  }
});

// Newsletter insights. Note: the Newsletter collection has a 7-day TTL (see
// models/newsletterModel.ts), so anything queried directly from it only
// ever reflects the last 7 days — all-time volume comes from
// User.totalnewsletter instead, which is incremented on every send and
// never deleted.
router.get("/insights/newsletters", async (req, res) => {
  try {
    const [totalAllTimeAgg, dailyAgg, byFeedTypeAgg, topSubscribers] =
      await Promise.all([
        User.aggregate([
          { $group: { _id: null, total: { $sum: "$totalnewsletter" } } },
        ]),
        Newsletter.aggregate([
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Newsletter.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          { $unwind: "$userDoc" },
          { $group: { _id: "$userDoc.wise", count: { $sum: 1 } } },
        ]),
        User.find({})
          .select("email totalnewsletter")
          .sort({ totalnewsletter: -1 })
          .limit(5)
          .lean(),
      ]);

    res.status(200).json({
      code: 0,
      data: {
        totalAllTime: totalAllTimeAgg[0]?.total || 0,
        last7Days: dailyAgg.map((d: any) => ({ date: d._id, count: d.count })),
        byFeedType: Object.fromEntries(
          byFeedTypeAgg.map((d: any) => [d._id || "unknown", d.count])
        ),
        topSubscribers,
      },
    });
  } catch (error) {
    console.error("Error fetching newsletter insights:", error);
    res
      .status(500)
      .json({ code: 1, message: "Error fetching newsletter insights" });
  }
});

// Scheduler / job-lock health: lets an admin confirm the distributed lock is
// actually working — i.e. each scheduled run (newsletter batch, tweet
// fetch, weekly digest) is claimed by exactly one replica, not fired by all
// of them. See jobs/jobLock.ts.
router.get("/system/jobs", async (req, res) => {
  try {
    const recentJobs = await JobLock.find({})
      .sort({ lockedAt: -1 })
      .limit(30)
      .select("jobKey lockedBy lockedAt status completedAt")
      .lean();

    const statusCounts = recentJobs.reduce(
      (acc: { [status: string]: number }, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      },
      {}
    );

    res.status(200).json({
      code: 0,
      data: { recentJobs, statusCounts },
    });
  } catch (error) {
    console.error("Error fetching job health:", error);
    res.status(500).json({ code: 1, message: "Error fetching job health" });
  }
});

export default router;
