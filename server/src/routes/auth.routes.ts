import express from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { authenticateJWT } from "../middleware/auth.middleware";
import { signJWT, verifyJWT } from "../services/auth.service";
import {
  createRefreshToken,
  refreshTokenTtlSeconds,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../services/refreshToken.service";
import { logActivity, ActivityType } from "../services/auditLog.service";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
} from "../services/newsletter.service";
import sgMail, { sendAdminAlert } from "../services/email.service";
import {
  canRequestOtp,
  consumeResetToken,
  createOtp,
  verifyOtp,
} from "../services/passwordReset.service";
import {
  emailValidationRateLimit,
  loginRateLimit,
  passwordResetRateLimit,
  registerRateLimit,
} from "../middleware/rateLimit.middleware";

const router = express.Router();
const REFRESH_COOKIE = "feedrecap_refresh";

function refreshCookieOptions() {
  const production = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: production, sameSite: production ? ("none" as const) : ("lax" as const), path: "/", maxAge: refreshTokenTtlSeconds * 1000 };
}

function readRefreshCookie(req: express.Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === REFRESH_COOKIE) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function trustedOrigin(req: express.Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;
  return origin === process.env.ORIGIN || origin === process.env.CLIENT_URL;
}

async function setRefreshCookie(res: express.Response, userId: string, email: string) {
  const refreshToken = await createRefreshToken({ userId, email });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

// Login route - JWT based
router.post("/login", loginRateLimit, async (req, res) => {
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

    await setRefreshCookie(res, (user._id as mongoose.Types.ObjectId).toString(), user.email);

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
    console.error("[Auth] Error during login:", error);
    return res.status(500).json({ code: 1, message: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  if (!trustedOrigin(req)) return res.status(403).json({ code: 1, message: "Invalid request origin" });
  const current = readRefreshCookie(req);
  if (!current) return res.status(401).json({ code: 1, message: "Refresh token required" });
  const rotated = await rotateRefreshToken(current);
  if (!rotated) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    return res.status(401).json({ code: 1, message: "Invalid or expired refresh token" });
  }
  res.cookie(REFRESH_COOKIE, rotated.token, refreshCookieOptions());
  return res.status(200).json({ code: 0, token: signJWT(rotated.session), email: rotated.session.email });
});

router.post("/logout", authenticateJWT, async (req, res) => {
  if (!trustedOrigin(req)) return res.status(403).json({ code: 1, message: "Invalid request origin" });
  const currentRefreshToken = readRefreshCookie(req);
  if (currentRefreshToken) await revokeRefreshToken(currentRefreshToken);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
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
router.get("/validateEmail", emailValidationRateLimit, async (req, res) => {
  const email: string = req.query.email as string;
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json({ code: 0, message: "Email exists" });
    } else {
      res.status(404).json({ code: 1, message: "Email does not exist" });
    }
  } catch (err) {
    console.error("[Auth] Error validating email:", err);
    res.status(500).json({ code: 1, message: "Error validating email" });
  }
});

// Register route
router.post("/register", registerRateLimit, async (req, res) => {
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

    await setRefreshCookie(res, (newUser._id as mongoose.Types.ObjectId).toString(), newUser.email);

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
    console.error("[Auth] Error registering user:", err);
    res.status(500).send({ code: 1, message: "Error registering user" });
  }
});

// Reset password route. A short-lived token issued only after server-side OTP
// verification is required, preventing direct password-reset bypasses.
router.post("/resetPassword", passwordResetRateLimit, async (req, res) => {
  const { email, newPassword, resetToken } = req.body;
  if (!email || !newPassword || !resetToken) {
    return res.status(400).json({ code: 1, message: "Invalid reset request" });
  }
  if (!(await consumeResetToken(email, resetToken))) {
    return res.status(401).json({ code: 1, message: "Invalid or expired reset authorization" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ code: 1, message: "Invalid reset request" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await logActivity(req, {
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      activityType: ActivityType.PASSWORD_CHANGED,
      activityDescription: "Password changed",
    });

    return res.status(200).json({ code: 0, message: "Password updated successfully" });
  } catch (err) {
    console.error("[Auth] Error resetting password:", err);
    return res.status(500).json({ code: 1, message: "Error updating password" });
  }
});

// Generate and email an OTP. The OTP is intentionally never returned in the
// API response; verification happens only on the server.
router.post("/sentOTP", passwordResetRateLimit, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).send({ code: 1, message: "Email is required" });
  }
  if (!(await canRequestOtp(email))) {
    return res.status(429).send({ code: 1, message: "Too many OTP requests. Please try again later." });
  }

  // Use the same generic response for unknown accounts to avoid account
  // enumeration through this endpoint.
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).send({ code: 0, message: "If the account exists, an OTP has been sent." });
  }

  const otp = await createOtp(email);
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL || "",
    subject: "Your FeedRecap OTP Code is here",
    text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    html: `<strong>Your OTP code is ${otp}. It expires in 10 minutes.</strong>`,
  };

  try {
    await sgMail.send(msg);
    return res.status(200).send({ code: 0, message: "If the account exists, an OTP has been sent." });
  } catch (err) {
    console.error("[Auth] Error sending OTP email:", err);
    return res.status(500).send({ code: 1, message: "Unable to send OTP" });
  }
});

router.post("/verifyResetOTP", passwordResetRateLimit, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "");
  if (!email || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ code: 1, message: "Invalid OTP" });
  }

  const result = await verifyOtp(email, otp);
  if (!result.ok) {
    return res.status(401).json({ code: 1, message: "Invalid or expired OTP" });
  }
  return res.status(200).json({ code: 0, resetToken: result.resetToken });
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
      console.error("[Auth] Google OAuth error:", err);
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
        await setRefreshCookie(
          res,
          (existingUser._id as mongoose.Types.ObjectId).toString(),
          existingUser.email
        );
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
        await setRefreshCookie(
          res,
          (user._id as mongoose.Types.ObjectId).toString(),
          user.email
        );
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
