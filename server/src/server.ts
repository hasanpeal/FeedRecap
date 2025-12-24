import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import bcrypt from "bcrypt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import mongoose from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "./userModel";
import "./digest";
import { Newsletter } from "./newsletterModel";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
  fetchAndStoreTweetsForProfiles,
  generateCustomProfileNewsletter,
  getStoredTweetsForUser,
} from "./digest";
import { StoredTweets, CustomProfilePosts } from "./tweetModel";
import { logActivity, ActivityType } from "./auditLogger";

env.config();

// JWT Configuration
const JWT_SECRET: string =
  process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d"; // 7 days

// JWT Token Interface
interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// JWT Utilities
function signJWT(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "feedrecap",
  } as jwt.SignOptions);
}

function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: "feedrecap",
  }) as JWTPayload;
}

// JWT Authentication Middleware
function authenticateJWT(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ code: 1, message: "No authorization header" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ code: 1, message: "No token provided" });
  }

  try {
    const decoded = verifyJWT(token);
    // Attach user info to request
    (req as any).user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ code: 1, message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ code: 1, message: "Invalid token" });
    }
    return res.status(401).json({ code: 1, message: "Authentication failed" });
  }
}

// Admin Authentication Middleware
async function authenticateAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ code: 1, message: "No authorization header" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ code: 1, message: "No token provided" });
  }

  try {
    const decoded = verifyJWT(token);

    // Check if user is admin from database
    const user = await User.findById(decoded.userId).select("isAdmin");
    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .json({ code: 1, message: "Admin access required" });
    }

    // Attach user info to request
    (req as any).user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ code: 1, message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ code: 1, message: "Invalid token" });
    }
    return res.status(401).json({ code: 1, message: "Authentication failed" });
  }
}

const app = express();
const port = 3001;

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// Trust the first proxy
app.set("trust proxy", 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuring cors
app.use(
  cors({
    origin: [process.env.ORIGIN || "", process.env.ORIGINTEST || ""],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing gracefully.");
  process.exit(0);
});

// Passport local strategy for authentication
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Incorrect email" });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Passport is only used for OAuth, not for session management
app.use(passport.initialize());

// Use JWT authentication middleware instead of session-based
// authenticateJWT is defined above in JWT utilities section

// API endpoint to log page visits from frontend
app.post("/logPageVisit", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = (req as any).user;
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
    res.status(500).json({ code: 1, message: "Error logging page visit" });
  }
});

app.get("/data", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = (req as any).user;

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

app.post("/unlinkX", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = (req as any).user;

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

app.post("/saveX", async (req, res) => {
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

app.get("/newsletter/:id", async (req, res) => {
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

app.post("/updateProfiles", authenticateJWT, async (req, res) => {
  const { profiles } = req.body;
  const userFromToken = (req as any).user;

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

app.post("/updateFeedType", authenticateJWT, async (req, res) => {
  const { wise, categories, profiles } = req.body;
  const userFromToken = (req as any).user;

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

// Login route - JWT based
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ code: 1, message: "Email and password required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ code: 1, message: "Incorrect email" });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ code: 1, message: "Incorrect password" });
    }

    // Generate JWT token
    const token = signJWT({
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
    });

    // Log login activity
    await logActivity(req, {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      activityType: ActivityType.LOGIN,
      activityDescription: "User logged in",
      page: "/signin",
    });

    return res.status(200).json({
      code: 0,
      message: "Login successful",
      token,
      email: user.email, // Return email for frontend context
    });
  } catch (error) {
    return res.status(500).json({ code: 1, message: "Internal server error" });
  }
});

// Logout route - JWT based (client-side token removal)
app.post("/logout", authenticateJWT, async (req, res) => {
  const userFromToken = (req as any).user;

  // Log logout activity
  await logActivity(req, {
    userId: userFromToken.id,
    email: userFromToken.email,
    activityType: ActivityType.LOGOUT,
    activityDescription: "User logged out",
  });

  // With JWT, logout is handled client-side by removing the token
  // Optionally, you could maintain a token blacklist in Redis/MongoDB
  // For now, we just confirm logout
  res.status(200).json({ code: 0, message: "Logout successful" });
});

// Validate email route
app.get("/validateEmail", async (req, res) => {
  const email: string = req.query.email as string;
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json({ code: 0, message: "Email exists" });
    } else {
      res.status(404).json({ code: 1, message: "Email does not exist" });
    }
  } catch (err) {
    res.status(500).json({ code: 1, message: "Error validating email" });
  }
});

// Register route
app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send({ code: 1, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    // Generate JWT token for new user
    const token = signJWT({
      userId: (newUser._id as mongoose.Types.ObjectId).toString(),
      email: newUser.email,
    });

    // Log account creation
    await logActivity(req, {
      userId: (newUser._id as mongoose.Types.ObjectId).toString(),
      email: newUser.email,
      activityType: ActivityType.ACCOUNT_CREATED,
      activityDescription: "New account created",
      page: "/signup",
      metadata: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });

    res.status(201).send({
      code: 0,
      message: "User registered successfully",
      token,
      email: newUser.email,
    });
    const { tweetsByCategory, top15Tweets } = await fetchTweetsForCategories([
      "Politics",
      "Geopolitics",
      "Finance",
      "AI",
      "Tech",
      "Crypto",
      "Meme",
      "Sports",
      "Entertainment",
    ]);
    const newsletter = await generateNewsletter(tweetsByCategory, top15Tweets);
    if (newsletter) {
      await sendNewsletterEmail(newUser, newsletter);
    }
    const digestMessage = `First Name:${firstName}\nLast Name: ${lastName}\nEmail: ${email}`;

    const msg = {
      to: "pealh0320@gmail.com",
      from: process.env.FROM_EMAIL || "",
      subject: `New User Alert`,
      text: digestMessage,
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(`❌ [Error]: Error Sending Total User count`);
    }
  } catch (err) {
    res.status(500).send({ code: 1, message: "Error registering user" });
  }
});

// Reset password route
app.post("/resetPassword", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ code: 1, message: "User doesn't exist" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Log password change
    await logActivity(req, {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      activityType: ActivityType.PASSWORD_CHANGED,
      activityDescription: "Password changed",
    });

    res.status(200).json({ code: 0, message: "Password updated successfully" });
  } catch (err) {
    res.status(200).json({ code: 1, message: "Error updating password" });
  }
});

// POST Route for sending OTP
app.post("/sentOTP", async (req, res) => {
  // console.log("Directed to POST Route -> /sentOTP");
  const email = req.body.email;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const msg = {
    to: email,
    from: process.env.FROM_EMAIL || "",
    subject: "Your FeedRecap OTP Code is here",
    text: `Your OTP code is ${otp}`,
    html: `<strong> Your OTP code is ${otp}</strong>`,
  };
  await sgMail
    .send(msg)
    .then(async () => {
      // console.log("OTP successfully sent");
      res.status(200).send({ code: 0, otp: otp });
    })
    .catch((err: any) => {
      console.log("Error sending OTP email on /sentOTP route");
      res.status(200).send({ code: 1 });
    });
});

//Google OAuth strategy configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT || "",
      clientSecret: process.env.SECRET || "",
      callbackURL: `${process.env.SERVER}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0].value;
        if (!email) {
          return done(new Error("No email found"));
        }

        // Find the user by email in MongoDB
        let user = await User.findOne({ email });

        if (!user) {
          // If user doesn't exist, create a new user
          const firstName = profile.name?.givenName || "";
          const lastName = profile.name?.familyName || "";
          user = new User({
            firstName,
            lastName,
            email,
            password: "", // Empty password as the user signed up via Google OAuth
            isNewUser: false,
            time: ["Morning", "Afternoon", "Night"],
            newsletter:
              "Thank you for signing up. Please wait for your first newsletter to generate",
            categories: [
              "Politics",
              "Geopolitics",
              "Finance",
              "AI",
              "Tech",
              "Crypto",
              "Meme",
              "Sports",
              "Entertainment",
            ],
          });

          await user.save();
          const { tweetsByCategory, top15Tweets } =
            await fetchTweetsForCategories([
              "Politics",
              "Geopolitics",
              "Finance",
              "AI",
              "Tech",
              "Crypto",
              "Meme",
              "Sports",
              "Entertainment",
            ]);
          const newsletter = await generateNewsletter(
            tweetsByCategory,
            top15Tweets
          );
          if (newsletter) {
            await sendNewsletterEmail(user, newsletter);
          }
          const digestMessage = `First Name:${firstName}\nLast Name: ${lastName}\nEmail: ${email}`;

          const msg = {
            to: "pealh0320@gmail.com",
            from: process.env.FROM_EMAIL || "",
            subject: `New User Alert`,
            text: digestMessage,
          };

          const msg2 = {
            to: "jeremy.shoykhet+1@gmail.com",
            from: process.env.FROM_EMAIL || "",
            subject: `New User Alert`,
            text: digestMessage,
          };

          const msg3 = {
            to: "support@overtonnews.com",
            from: process.env.FROM_EMAIL || "",
            subject: `New User Alert`,
            text: digestMessage,
          };

          try {
            await sgMail.send(msg);
            await sgMail.send(msg2);
            await sgMail.send(msg3);
          } catch (error) {
            console.error(`❌ [Error]: Error Sending Total User count`);
          }
          return done(null, user);
        } else {
          // If user exists, return the user
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Google sign-up route
app.get(
  "/auth/google/signup",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google sign-in route
app.get(
  "/auth/google/signin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", async (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(200).json({
        code: 1,
        message: info ? info.message : "Authentication failed",
      });
    }

    const email = user.email;

    // Check if the user already exists in MongoDB
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If the user exists
      if (req.query.signup === "true") {
        return res.redirect(
          `${process.env.CLIENT_URL}/signup/?code=1&message=User%20already%20exists`
        );
      } else {
        // Generate JWT token for existing user
        const token = signJWT({
          userId: (existingUser._id as mongoose.Types.ObjectId).toString(),
          email: existingUser.email,
        });
        return res.redirect(
          `${
            process.env.CLIENT_URL
          }/signin/?code=0&message=Login%20successful&token=${encodeURIComponent(
            token
          )}`
        );
      }
    } else {
      // If the user doesn't exist
      if (req.query.signup === "true") {
        // Generate JWT token for new user
        const token = signJWT({
          userId: (user._id as mongoose.Types.ObjectId).toString(),
          email: user.email,
        });
        return res.redirect(
          `${
            process.env.CLIENT_URL
          }/signup/?code=0&message=Sign%20up%20successful&token=${encodeURIComponent(
            token
          )}`
        );
      } else {
        return res.redirect(
          `${process.env.CLIENT_URL}/signin/?code=1&message=User%20does%20not%20exist`
        );
      }
    }
  })(req, res, next);
});

//Redirect to Google for sign-up
app.get("/auth/google/signup", (req, res, next) => {
  req.query.signup = "true";
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});

//Redirect to Google for sign-in
app.get("/auth/google/signin", (req, res, next) => {
  // console.log("Sign in google route hits");
  req.query.signup = "false";
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});

// Route to check cookie consent (stored in user model or localStorage on client)
app.get("/getCookieConsent", authenticateJWT, async (req, res) => {
  // Cookie consent can be stored in user model if needed
  // For now, it's handled client-side
  res.status(200).json({ code: 0, consent: null });
});

// Route to update cookie consent (optional - can be client-side only)
app.post("/updateCookieConsent", authenticateJWT, async (req, res) => {
  // Cookie consent can be stored in user model if needed
  // For now, it's handled client-side
  res.status(200).json({ code: 0, message: "Cookie consent updated" });
});

// Check JWT token route
app.get("/check-session", authenticateJWT, (req, res) => {
  const user = (req as any).user;
  res.status(200).json({ isAuthenticated: true, email: user.email });
});

// Route to update Categories
app.post("/updateCategories", authenticateJWT, async (req, res) => {
  const { categories } = req.body;
  const userFromToken = (req as any).user;

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
app.post("/updateTimes", async (req, res) => {
  const { email, time } = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
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

// Get isNewUser
app.get("/getIsNewUser", authenticateJWT, async (req, res) => {
  const userFromToken = (req as any).user;

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
app.get("/getUserDetails", authenticateJWT, async (req, res) => {
  const userFromToken = (req as any).user;

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
app.post("/updateAccount", authenticateJWT, async (req, res) => {
  const { newFirstName, newLastName, newEmail } = req.body;
  const userFromToken = (req as any).user;

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

// Log link click endpoint
app.post("/logLinkClick", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = (req as any).user;
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
    res.status(500).json({ code: 1, message: "Error logging link click" });
  }
});

// Log feedback endpoint
app.post("/logFeedback", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = (req as any).user;
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
    res.status(500).json({ code: 1, message: "Error logging feedback" });
  }
});

// Admin Dashboard API Endpoints

// Get page views analytics
app.get("/admin/analytics/pageviews", authenticateAdmin, async (req, res) => {
  try {
    const { period, page } = req.query;
    const { AuditLog } = await import("./auditLogModel");

    let startDate = new Date();
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
      case "6m":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

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
app.get("/admin/analytics/linkclicks", authenticateAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    const { AuditLog } = await import("./auditLogModel");

    let startDate = new Date();
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
      case "6m":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

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
app.get("/admin/audit-logs", authenticateAdmin, async (req, res) => {
  try {
    const { userEmail, activityType, limit = 100, skip = 0 } = req.query;
    const { AuditLog } = await import("./auditLogModel");

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
app.get("/admin/users", authenticateAdmin, async (req, res) => {
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
app.get("/admin/analytics/activities", authenticateAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    const { AuditLog } = await import("./auditLogModel");

    let startDate = new Date();
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
      case "6m":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

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

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
