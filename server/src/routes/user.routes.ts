import express from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { Newsletter } from "../models/newsletter.model";
import { StoredTweets, CustomProfilePosts } from "../models/tweet.model";
import { authenticateJWT } from "../middleware/auth.middleware";
import { signJWT } from "../services/auth.service";
import { logActivity, ActivityType } from "../services/auditLog.service";
import { fetchAndStoreTweetsForProfiles } from "../services/twitter.service";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
  generateCustomProfileNewsletter,
  getStoredTweetsForUser,
} from "../services/newsletter.service";

const router = express.Router();

const MAX_CUSTOM_PROFILES = 10;

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;

interface QuotedTweetDoc {
  tweet_id?: string | null;
  text?: string | null;
  likes?: number | null;
  createdAt?: Date | null;
  mediaThumbnail?: string | null;
  video?: string | null;
  videoThumbnail?: string | null;
  avatar?: string | null;
  screenName?: string | null;
}

interface RawAggregatedPost {
  username: string;
  avatar?: string;
  time: Date;
  likes: number;
  category?: string;
  text: string;
  tweet_id: string;
  mediaThumbnail?: string;
  video?: string;
  videoThumbnail?: string;
  quotedTweet?: QuotedTweetDoc;
}

function normalizePost(post: RawAggregatedPost) {
  return {
    username: post.username,
    avatar: post.avatar,
    time: post.time,
    likes: post.likes,
    category: post.category,
    text: post.text,
    tweet_id: post.tweet_id,
    mediaThumbnail: post.mediaThumbnail || undefined,
    video: post.video || undefined,
    videoThumbnail: post.videoThumbnail || undefined,
    quotedTweet: post.quotedTweet
      ? {
          tweet_id: post.quotedTweet.tweet_id || null,
          text: post.quotedTweet.text || null,
          likes: post.quotedTweet.likes || null,
          createdAt: post.quotedTweet.createdAt || null,
          mediaThumbnail: post.quotedTweet.mediaThumbnail || null,
          video: post.quotedTweet.video || null,
          videoThumbnail: post.quotedTweet.videoThumbnail || null,
          avatar: post.quotedTweet.avatar || null,
          username: post.quotedTweet.screenName || null,
        }
      : undefined,
  };
}

router.get("/data", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;

    // Fetch user data using email from JWT token
    const user = await User.findOne({ email: userFromToken.email }).select(
      "categories time timezone newsletter wise profiles twitterUsername"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found", code: 1 });
    }

    // Fetch the latest newsletter for the user
    const latestNewsletter = await Newsletter.findOne({ user: user._id })
      .sort({ createdAt: -1 }) // Get the latest newsletter
      .select("_id"); // Only return the ID

    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const sortByLikes = req.query.sortBy === "likes";
    const sortDirection = req.query.sortOrder === "asc" ? 1 : -1;
    const categoryFilter = (req.query.category as string) || null;
    const profileFilter = (req.query.profile as string) || null;
    const sortField = sortByLikes ? "tweets.likes" : "tweets.createdAt";

    let posts: ReturnType<typeof normalizePost>[] = [];
    let hasMore = false;
    let profileAvatars: Record<string, string> = {};

    if (user.wise === "categorywise") {
      const matchStage: Record<string, unknown> = {
        category: { $in: user.categories },
      };
      if (categoryFilter && user.categories.includes(categoryFilter)) {
        matchStage.category = categoryFilter;
      }

      const rawPosts = await StoredTweets.aggregate<RawAggregatedPost>(
        [
          { $match: matchStage },
          { $unwind: "$tweets" },
          { $sort: { [sortField]: sortDirection } },
          { $skip: (page - 1) * limit },
          { $limit: limit + 1 },
          {
            $project: {
              _id: 0,
              username: "$screenName",
              avatar: "$avatar",
              time: "$tweets.createdAt",
              likes: "$tweets.likes",
              category: "$category",
              text: "$tweets.text",
              tweet_id: "$tweets.tweet_id",
              mediaThumbnail: "$tweets.mediaThumbnail",
              video: "$tweets.video",
              videoThumbnail: "$tweets.videoThumbnail",
              quotedTweet: "$tweets.quotedTweet",
            },
          },
        ],
        { allowDiskUse: true }
      );

      hasMore = rawPosts.length > limit;
      posts = rawPosts.slice(0, limit).map(normalizePost);

      // Cheap, tweets-array-free query so profile avatars are available
      // regardless of which page of posts is currently loaded.
      const avatarDocs = await StoredTweets.find({
        category: { $in: user.categories },
      })
        .select("screenName avatar")
        .lean();
      profileAvatars = Object.fromEntries(
        avatarDocs.map((d) => [d.screenName, d.avatar])
      );
    } else if (user.wise === "customProfiles") {
      const matchStage: Record<string, unknown> = {
        screenName: { $in: user.profiles },
      };
      if (profileFilter && user.profiles.includes(profileFilter)) {
        matchStage.screenName = profileFilter;
      }

      const rawPosts = await CustomProfilePosts.aggregate<RawAggregatedPost>(
        [
          { $match: matchStage },
          { $unwind: "$tweets" },
          { $sort: { [sortField]: sortDirection } },
          { $skip: (page - 1) * limit },
          { $limit: limit + 1 },
          {
            $project: {
              _id: 0,
              username: "$screenName",
              avatar: "$avatar",
              time: "$tweets.createdAt",
              likes: "$tweets.likes",
              text: "$tweets.text",
              tweet_id: "$tweets.tweet_id",
              mediaThumbnail: "$tweets.mediaThumbnail",
              video: "$tweets.video",
              videoThumbnail: "$tweets.videoThumbnail",
              quotedTweet: "$tweets.quotedTweet",
            },
          },
        ],
        { allowDiskUse: true }
      );

      hasMore = rawPosts.length > limit;
      posts = rawPosts.slice(0, limit).map(normalizePost);

      const avatarDocs = await CustomProfilePosts.find({
        screenName: { $in: user.profiles },
      })
        .select("screenName avatar")
        .lean();
      profileAvatars = Object.fromEntries(
        avatarDocs.map((d) => [d.screenName, d.avatar])
      );
    }

    // ✅ Send user details + paginated posts in response
    res.status(200).json({
      user: {
        categories: user.categories,
        time: user.time,
        timezone: user.timezone,
        newsletter: user.newsletter,
        wise: user.wise,
        profiles: user.profiles,
        twitterUsername: user.twitterUsername,
        latestNewsletterId: latestNewsletter ? latestNewsletter._id : null, // Send the latest newsletter ID
      },
      posts,
      profileAvatars,
      pagination: { page, limit, hasMore },
      code: 0,
    });
  } catch (error) {
    console.error("[User] Error fetching user data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching data", code: 1 });
  }
});

const TRENDING_WINDOW_HOURS = 4;
const TRENDING_LIMIT = 5;

// Top-liked post per account from the last few hours, independent of the
// paginated /data feed so it doesn't depend on which page is loaded.
router.get("/trending", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;

    const user = await User.findOne({ email: userFromToken.email }).select(
      "wise categories profiles"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found", code: 1 });
    }

    let Model: typeof StoredTweets | typeof CustomProfilePosts | null = null;
    let matchStage: Record<string, unknown> | null = null;

    if (user.wise === "categorywise") {
      Model = StoredTweets;
      matchStage = { category: { $in: user.categories } };
    } else if (user.wise === "customProfiles") {
      Model = CustomProfilePosts;
      matchStage = { screenName: { $in: user.profiles } };
    }

    if (!Model || !matchStage) {
      return res.status(200).json({ posts: [], code: 0 });
    }

    const windowStart = new Date(
      Date.now() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000
    );

    const trendingPosts = await Model.aggregate(
      [
        { $match: matchStage },
        { $unwind: "$tweets" },
        { $match: { "tweets.createdAt": { $gte: windowStart } } },
        { $sort: { "tweets.likes": -1 } },
        {
          $group: {
            _id: "$screenName",
            username: { $first: "$screenName" },
            avatar: { $first: "$avatar" },
            time: { $first: "$tweets.createdAt" },
            likes: { $first: "$tweets.likes" },
            text: { $first: "$tweets.text" },
            tweet_id: { $first: "$tweets.tweet_id" },
            mediaThumbnail: { $first: "$tweets.mediaThumbnail" },
            video: { $first: "$tweets.video" },
            videoThumbnail: { $first: "$tweets.videoThumbnail" },
          },
        },
        { $sort: { likes: -1 } },
        { $limit: TRENDING_LIMIT },
        {
          $project: {
            _id: 0,
            username: 1,
            avatar: 1,
            time: 1,
            likes: 1,
            text: 1,
            tweet_id: 1,
            mediaThumbnail: 1,
            video: 1,
            videoThumbnail: 1,
          },
        },
      ],
      { allowDiskUse: true }
    );

    res.status(200).json({ posts: trendingPosts, code: 0 });
  } catch (error) {
    console.error("[User] Error fetching trending posts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching trending posts", code: 1 });
  }
});

router.post("/unlinkX", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;

    const user = await User.findOneAndUpdate(
      { email: userFromToken.email },
      { twitterUsername: null }
    );

    if (user) {
      // Log Twitter account unlinking
      await logActivity(req, {
        userId: userFromToken.id,
        email: userFromToken.email,
        activityType: ActivityType.TWITTER_ACCOUNT_UNLINKED,
        activityDescription: "Unlinked Twitter account",
      });
    }

    res.json({
      success: true,
      message: "Twitter account unlinked successfully",
    });
  } catch (err) {
    console.error("[User] Error unlinking Twitter account:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/saveX", async (req, res) => {
  try {
    const { email, twitterUsername } = req.body;
    if (!email || !twitterUsername)
      return res
        .status(400)
        .json({ error: "Email and Twitter username required" });

    const user = await User.findOneAndUpdate({ email }, { twitterUsername });

    if (user) {
      // Log Twitter account linking
      await logActivity(req, {
        userId: (user._id as mongoose.Types.ObjectId).toString(),
        email: user.email,
        activityType: ActivityType.TWITTER_ACCOUNT_LINKED,
        activityDescription: `Linked Twitter account: ${twitterUsername}`,
        metadata: {
          twitterUsername,
        },
      });
    }

    res.json({ success: true, message: "Twitter account linked successfully" });
  } catch (err) {
    console.error("[User] Error linking Twitter account:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/updateProfiles", authenticateJWT, async (req, res) => {
  const { profiles } = req.body;
  const userFromToken = req.user!;

  if (!Array.isArray(profiles) || profiles.length > MAX_CUSTOM_PROFILES) {
    return res.status(400).json({
      code: 1,
      message: `You can follow up to ${MAX_CUSTOM_PROFILES} profiles.`,
    });
  }

  try {
    // Fetch the current user
    const user = await User.findOne({ email: userFromToken.email });

    if (!user) {
      return res.status(200).json({ code: 1, message: "User not found" });
    }

    // Get the current profiles
    const currentProfiles = user.profiles || [];

    // Find newly added profiles
    const changedProfiles = profiles.filter(
      (profile: string) => !currentProfiles.includes(profile)
    );

    // Update the user's profiles in the database
    const updatedUser = await User.findOneAndUpdate(
      { email: userFromToken.email },
      { profiles },
      { new: true }
    );

    // // If profiles were changed, fetch new tweets
    if (changedProfiles.length > 0) {
      console.log(
        `[User] Refetching tweets for ${changedProfiles.length} newly added profile(s)`
      );
      await fetchAndStoreTweetsForProfiles(changedProfiles);
    }

    // ✅ Fetch updated posts for the user
    const profilePosts = await CustomProfilePosts.find({
      screenName: { $in: updatedUser?.profiles },
    }).select("screenName tweets avatar");

    const posts = profilePosts.flatMap((post) =>
      post.tweets.map((tweet) => ({
        username: post.screenName,
        avatar: post.avatar || "/placeholder.svg",
        time: tweet.createdAt,
        likes: tweet.likes,
        text: tweet.text,
        tweet_id: tweet.tweet_id,
        mediaThumbnail: tweet.mediaThumbnail || null,
        video: tweet.video || null,
        videoThumbnail: tweet.videoThumbnail || null,
        quotedTweet: tweet.quotedTweet
          ? {
              tweet_id: tweet.quotedTweet.tweet_id || null,
              text: tweet.quotedTweet.text || null,
              likes: tweet.quotedTweet.likes || null,
              createdAt: tweet.quotedTweet.createdAt || null,
              mediaThumbnail: tweet.quotedTweet.mediaThumbnail || null,
              video: tweet.quotedTweet.video || null,
              videoThumbnail: tweet.quotedTweet.videoThumbnail || null,
              avatar: tweet.quotedTweet.avatar || null, // ✅ Include quoted tweet's avatar
              username: tweet.quotedTweet.screenName || null,
            }
          : null,
      }))
    );

    // Log profiles update
    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.PROFILES_UPDATED,
      activityDescription: `Updated profiles: ${profiles.join(", ")}`,
      metadata: { profiles, changedProfiles },
    });

    return res.status(200).json({
      code: 0,
      message: "Profiles updated successfully",
      changedProfiles,
      profiles: updatedUser?.profiles,
      posts,
    });
  } catch (err) {
    console.error("[User] Error updating profiles:", err);
    return res
      .status(500)
      .json({ code: 1, message: "Error updating profiles" });
  }
});

router.post("/updateFeedType", authenticateJWT, async (req, res) => {
  const { wise, categories, profiles } = req.body;
  const userFromToken = req.user!;

  if (!wise) {
    return res
      .status(400)
      .json({ error: "Feed type (wise) is required", code: 1 });
  }

  // Validate inputs based on `wise` type
  if (wise === "customProfiles" && (!profiles || profiles.length < 3)) {
    return res.status(400).json({
      error: "At least 3 followed profiles are required for Custom Profiles.",
      code: 1,
    });
  }

  if (wise === "customProfiles" && profiles.length > MAX_CUSTOM_PROFILES) {
    return res.status(400).json({
      error: `You can follow up to ${MAX_CUSTOM_PROFILES} profiles.`,
      code: 1,
    });
  }

  if (wise === "categorywise" && (!categories || categories.length === 0)) {
    return res.status(400).json({
      error: "At least 1 category is required for Category-wise feed.",
      code: 1,
    });
  }

  try {
    // Update the user's feed type and associated data
    const updatedUser = await User.findOneAndUpdate(
      { email: userFromToken.email },
      { wise, categories, profiles },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found", code: 1 });
    }

    // Trigger appropriate fetching logic
    if (wise === "customProfiles") {
      await fetchAndStoreTweetsForProfiles(updatedUser.profiles); // Fetch tweets for followed profiles
    }

    // Log feed type update
    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.FEED_TYPE_UPDATED,
      activityDescription: `Updated feed type to: ${wise}`,
      metadata: { wise, categories, profiles },
    });

    res
      .status(200)
      .json({ message: "Feed type updated successfully", code: 0 });

    let newsletter = null;
    if (updatedUser.wise === "categorywise") {
      const { tweetsByCategory, top15Tweets } = await fetchTweetsForCategories(
        updatedUser.categories
      );
      newsletter = await generateNewsletter(tweetsByCategory, top15Tweets);
    } else if (updatedUser.wise === "customProfiles") {
      const { tweetsByProfiles, top15Tweets } = await getStoredTweetsForUser(
        updatedUser._id as mongoose.Types.ObjectId
      );
      newsletter = await generateCustomProfileNewsletter(
        tweetsByProfiles,
        top15Tweets
      );
    }

    if (newsletter) {
      await sendNewsletterEmail(updatedUser, newsletter);
      console.log(
        `[User] Newsletter sent to ${updatedUser.email} after feed type update`
      );
    }
  } catch (error) {
    console.error("[User] Error updating feed type:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating feed type", code: 1 });
  }
});

// Route to check cookie consent (stored in user model or localStorage on client)
router.get("/getCookieConsent", authenticateJWT, async (req, res) => {
  // Cookie consent can be stored in user model if needed
  // For now, it's handled client-side
  res.status(200).json({ code: 0, consent: null });
});

// Route to update cookie consent (optional - can be client-side only)
router.post("/updateCookieConsent", authenticateJWT, async (req, res) => {
  // Cookie consent can be stored in user model if needed
  // For now, it's handled client-side
  res.status(200).json({ code: 0, message: "Cookie consent updated" });
});

// Route to update Categories
router.post("/updateCategories", authenticateJWT, async (req, res) => {
  const { categories } = req.body;
  const userFromToken = req.user!;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: userFromToken.email },
      { categories },
      { new: true }
    );

    if (updatedUser) {
      // Log categories update
      await logActivity(req, {
        userId: userFromToken.id,
        email: userFromToken.email,
        activityType: ActivityType.CATEGORIES_UPDATED,
        activityDescription: `Updated categories: ${categories.join(", ")}`,
        metadata: { categories },
      });

      return res
        .status(200)
        .json({ code: 0, message: "Categories updated successfully" });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.error("[User] Error updating categories:", err);
    return res
      .status(200)
      .json({ code: 1, message: "Error updating categories" });
  }
});

// Route to update Times
router.post("/updateTimes", authenticateJWT, async (req, res) => {
  const { time } = req.body;
  const userFromToken = req.user!;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: userFromToken.email },
      { time },
      { new: true }
    );

    if (updatedUser) {
      return res
        .status(200)
        .json({ code: 0, message: "Preferred time updated successfully" });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.error("[User] Error updating time:", err);
    return res.status(200).json({ code: 1, message: "Error updating time" });
  }
});

// Public route to unsubscribe from email newsletters
router.post("/unsubscribeEmail", async (req, res) => {
  const { email } = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { time: [] },
      { new: true }
    );

    if (updatedUser) {
      return res
        .status(200)
        .json({ code: 0, message: "Unsubscribed successfully" });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.error("[User] Error unsubscribing:", err);
    return res.status(200).json({ code: 1, message: "Error unsubscribing" });
  }
});

// Get isNewUser
router.get("/getIsNewUser", authenticateJWT, async (req, res) => {
  const userFromToken = req.user!;

  try {
    const user = await User.findOne(
      { email: userFromToken.email },
      "isNewUser"
    ); // Fetch only the 'isNewUser' field
    if (user) {
      return res.status(200).json({ code: 0, isNewUser: user.isNewUser });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.error("[User] Error fetching isNewUser:", err);
    return res
      .status(200)
      .json({ code: 2, message: "Error fetching isNewUser" });
  }
});

// Route to access firstName, lastName, and password
router.get("/getUserDetails", authenticateJWT, async (req, res) => {
  const userFromToken = req.user!;

  try {
    const user = await User.findOne(
      { email: userFromToken.email },
      "firstName lastName password isAdmin"
    ); // Fetch firstName, lastName, password, and isAdmin
    if (user) {
      return res.status(200).json({
        code: 0,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin || false,
      });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.error("[User] Error fetching user details:", err);
    return res
      .status(200)
      .json({ code: 2, message: "Error fetching user details" });
  }
});

// Route to update account details
router.post("/updateAccount", authenticateJWT, async (req, res) => {
  const { newFirstName, newLastName, newEmail } = req.body;
  const userFromToken = req.user!;

  try {
    // Find the user by email from JWT token
    const user = await User.findOne({ email: userFromToken.email });

    if (!user) {
      return res.status(200).json({ code: 1, message: "User not found" });
    }

    // Update the fields only if they are not blank
    if (newFirstName && newFirstName.trim()) {
      user.firstName = newFirstName;
    }

    if (newLastName && newLastName.trim()) {
      user.lastName = newLastName;
    }

    if (newEmail && newEmail.trim()) {
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser) {
        return res
          .status(200)
          .json({ code: 1, message: "Account already exist with new email" });
      }
      user.email = newEmail;
    }

    // Save the updated user
    await user.save();

    // Generate new JWT token for the updated email
    const finalEmail =
      newEmail && newEmail.trim() ? newEmail : userFromToken.email;
    const token = signJWT({
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: finalEmail,
    });

    // Log account update
    await logActivity(req, {
      userId: userFromToken.id,
      email: userFromToken.email,
      activityType: ActivityType.ACCOUNT_UPDATED,
      activityDescription: "Account details updated",
      metadata: {
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
      },
    });

    return res.status(200).json({
      code: 0,
      message: "Account updated successfully",
      token,
      email: finalEmail,
    });
  } catch (err) {
    console.error("[User] Error updating account:", err);
    return res.status(200).json({ code: 2, message: "Error updating account" });
  }
});

export default router;
