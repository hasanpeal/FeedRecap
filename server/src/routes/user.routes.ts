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

    interface QuotedTweet {
      tweet_id?: string | null;
      text?: string | null;
      likes?: number | null;
      createdAt?: Date | null;
      mediaThumbnail?: string | null;
      video?: string | null;
      videoThumbnail?: string | null;
      avatar?: string | null;
      username?: string | null;
    }

    let posts: {
      username: string;
      avatar: string;
      time: Date;
      likes: number;
      category?: string;
      text: string;
      tweet_id: string;
      mediaThumbnail?: string;
      video?: string;
      videoThumbnail?: string;
      quotedTweet?: QuotedTweet;
    }[] = [];

    if (user.wise === "categorywise") {
      // Fetch posts based on category-wise selection
      const categoryPosts = await StoredTweets.find({
        category: { $in: user.categories },
      }).select("screenName createdAt tweets category avatar"); // ✅ Include avatar

      posts = categoryPosts.flatMap((post) =>
        post.tweets.map((tweet) => ({
          username: post.screenName,
          avatar: post.avatar, // ✅ Include avatar
          time: tweet.createdAt,
          likes: tweet.likes,
          category: post.category,
          text: tweet.text,
          tweet_id: tweet.tweet_id,
          mediaThumbnail: tweet.mediaThumbnail || undefined,
          video: tweet.video || undefined,
          videoThumbnail: tweet.videoThumbnail || undefined,
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
            : undefined,
        }))
      );
    } else if (user.wise === "customProfiles") {
      // Fetch posts based on custom profile-wise selection
      const profilePosts = await CustomProfilePosts.find({
        screenName: { $in: user.profiles },
      })
        .select("screenName tweets avatar")
        .lean(); // ✅ Include avatar

      posts = profilePosts.flatMap((post) =>
        post.tweets.map((tweet) => ({
          username: post.screenName,
          avatar: post.avatar, // ✅ Include avatar
          time: tweet.createdAt,
          likes: tweet.likes,
          text: tweet.text,
          tweet_id: tweet.tweet_id,
          mediaThumbnail: tweet.mediaThumbnail || undefined,
          video: tweet.video || undefined,
          videoThumbnail: tweet.videoThumbnail || undefined,
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
            : undefined,
        }))
      );
    }

    // ✅ Send user details + posts in response
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
      code: 0,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching data", code: 1 });
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
      console.log("Checked by changedProfiles");
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
    console.error("Error updating profiles:", err);
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
      console.log(`✅ [Debug] Newsletter sent to: ${updatedUser.email}`);
    }
  } catch (error) {
    console.error("Error updating feed type:", error);
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
    console.log("Error updating categories:", err);
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
    console.log("Error updating time:", err);
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
    console.log("Error unsubscribing:", err);
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
    console.log("Error fetching isNewUser:", err);
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
    console.log("Error fetching user details:", err);
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
    console.log("Error updating account:", err);
    return res.status(200).json({ code: 2, message: "Error updating account" });
  }
});

export default router;
