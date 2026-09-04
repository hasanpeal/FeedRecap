import express from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { authenticateJWT } from "../middleware/auth.middleware";
import { signJWT, verifyJWT } from "../services/auth.service";
import { logActivity, ActivityType } from "../services/auditLog.service";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
} from "../services/newsletter.service";
import sgMail, { sendAdminAlert } from "../services/email.service";

const router = express.Router();

// Login route - JWT based
router.post("/login", async (req, res) => {
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
router.post("/logout", authenticateJWT, async (req, res) => {
  const userFromToken = req.user!;

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
router.get("/validateEmail", async (req, res) => {
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
router.post("/register", async (req, res) => {
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

    await sendAdminAlert(["pealh0320@gmail.com"], `New User Alert`, digestMessage);
  } catch (err) {
    res.status(500).send({ code: 1, message: "Error registering user" });
  }
});

// Reset password route
router.post("/resetPassword", async (req, res) => {
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
router.post("/sentOTP", async (req, res) => {
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
      res.status(200).send({ code: 0, otp: otp });
    })
    .catch((err: any) => {
      console.log("Error sending OTP email on /sentOTP route");
      res.status(200).send({ code: 1 });
    });
});

// Google sign-up route
router.get(
  "/auth/google/signup",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google sign-in route
router.get(
  "/auth/google/signin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
router.get("/auth/google/callback", (req, res, next) => {
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

// Check JWT token route
router.get("/check-session", authenticateJWT, (req, res) => {
  const user = req.user!;
  res.status(200).json({ isAuthenticated: true, email: user.email });
});

export default router;
