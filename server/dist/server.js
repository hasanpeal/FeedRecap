"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const cors_1 = __importDefault(require("cors"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("./userModel");
require("./digest");
const newsletterModel_1 = require("./newsletterModel");
const digest_1 = require("./digest");
const tweetModel_1 = require("./tweetModel");
const auditLogger_1 = require("./auditLogger");
dotenv_1.default.config();
// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto_1.default.randomBytes(64).toString("hex");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // 7 days
// JWT Utilities
function signJWT(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: "feedrecap",
    });
}
function verifyJWT(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET, {
        issuer: "feedrecap",
    });
}
// JWT Authentication Middleware
function authenticateJWT(req, res, next) {
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
        req.user = { id: decoded.userId, email: decoded.email };
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ code: 1, message: "Token expired" });
        }
        else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ code: 1, message: "Invalid token" });
        }
        return res.status(401).json({ code: 1, message: "Authentication failed" });
    }
}
// Admin Authentication Middleware
async function authenticateAdmin(req, res, next) {
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
        const user = await userModel_1.User.findById(decoded.userId).select("isAdmin");
        if (!user || !user.isAdmin) {
            return res
                .status(403)
                .json({ code: 1, message: "Admin access required" });
        }
        // Attach user info to request
        req.user = { id: decoded.userId, email: decoded.email };
        next();
    }
    catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ code: 1, message: "Token expired" });
        }
        else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ code: 1, message: "Invalid token" });
        }
        return res.status(401).json({ code: 1, message: "Authentication failed" });
    }
}
const app = (0, express_1.default)();
const port = 3001;
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY || "");
// Trust the first proxy
app.set("trust proxy", 1);
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
// Configuring cors
app.use((0, cors_1.default)({
    origin: [process.env.ORIGIN || "", process.env.ORIGINTEST || ""],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
}));
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Closing gracefully.");
    process.exit(0);
});
// Passport local strategy for authentication
passport_1.default.use(new passport_local_1.Strategy({ usernameField: "email" }, async (email, password, done) => {
    try {
        const user = await userModel_1.User.findOne({ email });
        if (!user) {
            return done(null, false, { message: "Incorrect email" });
        }
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match) {
            return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
    }
    catch (err) {
        return done(err);
    }
}));
// Passport is only used for OAuth, not for session management
app.use(passport_1.default.initialize());
// Use JWT authentication middleware instead of session-based
// authenticateJWT is defined above in JWT utilities section
// API endpoint to log page visits from frontend
app.post("/logPageVisit", authenticateJWT, async (req, res) => {
    try {
        const userFromToken = req.user;
        const { page } = req.body;
        await (0, auditLogger_1.logActivity)(req, {
            userId: userFromToken.id,
            email: userFromToken.email,
            activityType: auditLogger_1.ActivityType.PAGE_VISIT,
            activityDescription: `Visited ${page}`,
            page: page || "unknown",
        });
        res.status(200).json({ code: 0, message: "Page visit logged" });
    }
    catch (error) {
        res.status(500).json({ code: 1, message: "Error logging page visit" });
    }
});
app.get("/data", authenticateJWT, async (req, res) => {
    try {
        const userFromToken = req.user;
        // Fetch user data using email from JWT token
        const user = await userModel_1.User.findOne({ email: userFromToken.email }).select("categories time timezone newsletter wise profiles twitterUsername");
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 1 });
        }
        // Fetch the latest newsletter for the user
        const latestNewsletter = await newsletterModel_1.Newsletter.findOne({ user: user._id })
            .sort({ createdAt: -1 }) // Get the latest newsletter
            .select("_id"); // Only return the ID
        let posts = [];
        if (user.wise === "categorywise") {
            // Fetch posts based on category-wise selection
            const categoryPosts = await tweetModel_1.StoredTweets.find({
                category: { $in: user.categories },
            }).select("screenName createdAt tweets category avatar"); // ✅ Include avatar
            posts = categoryPosts.flatMap((post) => post.tweets.map((tweet) => ({
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
            })));
        }
        else if (user.wise === "customProfiles") {
            // Fetch posts based on custom profile-wise selection
            const profilePosts = await tweetModel_1.CustomProfilePosts.find({
                screenName: { $in: user.profiles },
            })
                .select("screenName tweets avatar")
                .lean(); // ✅ Include avatar
            posts = profilePosts.flatMap((post) => post.tweets.map((tweet) => ({
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
            })));
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
    }
    catch (error) {
        console.error("Error fetching data:", error);
        res
            .status(500)
            .json({ error: "An error occurred while fetching data", code: 1 });
    }
});
app.post("/unlinkX", authenticateJWT, async (req, res) => {
    try {
        const userFromToken = req.user;
        const user = await userModel_1.User.findOneAndUpdate({ email: userFromToken.email }, { twitterUsername: null });
        if (user) {
            // Log Twitter account unlinking
            await (0, auditLogger_1.logActivity)(req, {
                userId: userFromToken.id,
                email: userFromToken.email,
                activityType: auditLogger_1.ActivityType.TWITTER_ACCOUNT_UNLINKED,
                activityDescription: "Unlinked Twitter account",
            });
        }
        res.json({
            success: true,
            message: "Twitter account unlinked successfully",
        });
    }
    catch (err) {
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
        const user = await userModel_1.User.findOneAndUpdate({ email }, { twitterUsername });
        if (user) {
            // Log Twitter account linking
            await (0, auditLogger_1.logActivity)(req, {
                userId: user._id.toString(),
                email: user.email,
                activityType: auditLogger_1.ActivityType.TWITTER_ACCOUNT_LINKED,
                activityDescription: `Linked Twitter account: ${twitterUsername}`,
                metadata: {
                    twitterUsername,
                },
            });
        }
        res.json({ success: true, message: "Twitter account linked successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
app.get("/newsletter/:id", async (req, res) => {
    try {
        const newsletter = await newsletterModel_1.Newsletter.findById(req.params.id);
        if (!newsletter)
            return res.status(404).send("Newsletter not found");
        // Log newsletter view if user is authenticated
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.startsWith("Bearer ")
                    ? req.headers.authorization.substring(7)
                    : req.headers.authorization;
                const decoded = verifyJWT(token);
                await (0, auditLogger_1.logActivity)(req, {
                    userId: decoded.userId,
                    email: decoded.email,
                    activityType: auditLogger_1.ActivityType.NEWSLETTER_VIEWED,
                    activityDescription: `Viewed newsletter: ${req.params.id}`,
                    metadata: { newsletterId: req.params.id },
                });
            }
            catch (error) {
                // Not authenticated, skip logging
            }
        }
        return res.status(200).json({ code: 0, newsletter: newsletter.content });
    }
    catch (error) {
        console.error("Error fetching newsletter:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.post("/updateProfiles", authenticateJWT, async (req, res) => {
    const { profiles } = req.body;
    const userFromToken = req.user;
    try {
        // Fetch the current user
        const user = await userModel_1.User.findOne({ email: userFromToken.email });
        if (!user) {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
        // Get the current profiles
        const currentProfiles = user.profiles || [];
        // Find newly added profiles
        const changedProfiles = profiles.filter((profile) => !currentProfiles.includes(profile));
        // Update the user's profiles in the database
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email: userFromToken.email }, { profiles }, { new: true });
        // // If profiles were changed, fetch new tweets
        if (changedProfiles.length > 0) {
            console.log("Checked by changedProfiles");
            await (0, digest_1.fetchAndStoreTweetsForProfiles)(changedProfiles);
        }
        // ✅ Fetch updated posts for the user
        const profilePosts = await tweetModel_1.CustomProfilePosts.find({
            screenName: { $in: updatedUser?.profiles },
        }).select("screenName tweets avatar");
        const posts = profilePosts.flatMap((post) => post.tweets.map((tweet) => ({
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
        })));
        // Log profiles update
        await (0, auditLogger_1.logActivity)(req, {
            userId: userFromToken.id,
            email: userFromToken.email,
            activityType: auditLogger_1.ActivityType.PROFILES_UPDATED,
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
    }
    catch (err) {
        console.error("Error updating profiles:", err);
        return res
            .status(500)
            .json({ code: 1, message: "Error updating profiles" });
    }
});
app.post("/updateFeedType", authenticateJWT, async (req, res) => {
    const { wise, categories, profiles } = req.body;
    const userFromToken = req.user;
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
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email: userFromToken.email }, { wise, categories, profiles }, { new: true } // Return the updated document
        );
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found", code: 1 });
        }
        // Trigger appropriate fetching logic
        if (wise === "customProfiles") {
            await (0, digest_1.fetchAndStoreTweetsForProfiles)(updatedUser.profiles); // Fetch tweets for followed profiles
        }
        // Log feed type update
        await (0, auditLogger_1.logActivity)(req, {
            userId: userFromToken.id,
            email: userFromToken.email,
            activityType: auditLogger_1.ActivityType.FEED_TYPE_UPDATED,
            activityDescription: `Updated feed type to: ${wise}`,
            metadata: { wise, categories, profiles },
        });
        res
            .status(200)
            .json({ message: "Feed type updated successfully", code: 0 });
        let newsletter = null;
        if (updatedUser.wise === "categorywise") {
            const { tweetsByCategory, top15Tweets } = await (0, digest_1.fetchTweetsForCategories)(updatedUser.categories);
            newsletter = await (0, digest_1.generateNewsletter)(tweetsByCategory, top15Tweets);
        }
        else if (updatedUser.wise === "customProfiles") {
            const { tweetsByProfiles, top15Tweets } = await (0, digest_1.getStoredTweetsForUser)(updatedUser._id);
            newsletter = await (0, digest_1.generateCustomProfileNewsletter)(tweetsByProfiles, top15Tweets);
        }
        if (newsletter) {
            await (0, digest_1.sendNewsletterEmail)(updatedUser, newsletter);
            console.log(`✅ [Debug] Newsletter sent to: ${updatedUser.email}`);
        }
    }
    catch (error) {
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
        const user = await userModel_1.User.findOne({ email });
        if (!user) {
            return res.status(401).json({ code: 1, message: "Incorrect email" });
        }
        // Verify password
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ code: 1, message: "Incorrect password" });
        }
        // Generate JWT token
        const token = signJWT({
            userId: user._id.toString(),
            email: user.email,
        });
        // Log login activity
        await (0, auditLogger_1.logActivity)(req, {
            userId: user._id.toString(),
            email: user.email,
            activityType: auditLogger_1.ActivityType.LOGIN,
            activityDescription: "User logged in",
            page: "/signin",
        });
        return res.status(200).json({
            code: 0,
            message: "Login successful",
            token,
            email: user.email, // Return email for frontend context
        });
    }
    catch (error) {
        return res.status(500).json({ code: 1, message: "Internal server error" });
    }
});
// Logout route - JWT based (client-side token removal)
app.post("/logout", authenticateJWT, async (req, res) => {
    const userFromToken = req.user;
    // Log logout activity
    await (0, auditLogger_1.logActivity)(req, {
        userId: userFromToken.id,
        email: userFromToken.email,
        activityType: auditLogger_1.ActivityType.LOGOUT,
        activityDescription: "User logged out",
    });
    // With JWT, logout is handled client-side by removing the token
    // Optionally, you could maintain a token blacklist in Redis/MongoDB
    // For now, we just confirm logout
    res.status(200).json({ code: 0, message: "Logout successful" });
});
// Validate email route
app.get("/validateEmail", async (req, res) => {
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email });
        if (user) {
            res.status(200).json({ code: 0, message: "Email exists" });
        }
        else {
            res.status(404).json({ code: 1, message: "Email does not exist" });
        }
    }
    catch (err) {
        res.status(500).json({ code: 1, message: "Error validating email" });
    }
});
// Register route
app.post("/register", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        const existingUser = await userModel_1.User.findOne({ email });
        if (existingUser) {
            return res.status(409).send({ code: 1, message: "User already exists" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = new userModel_1.User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        // Generate JWT token for new user
        const token = signJWT({
            userId: newUser._id.toString(),
            email: newUser.email,
        });
        // Log account creation
        await (0, auditLogger_1.logActivity)(req, {
            userId: newUser._id.toString(),
            email: newUser.email,
            activityType: auditLogger_1.ActivityType.ACCOUNT_CREATED,
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
        const { tweetsByCategory, top15Tweets } = await (0, digest_1.fetchTweetsForCategories)([
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
        const newsletter = await (0, digest_1.generateNewsletter)(tweetsByCategory, top15Tweets);
        if (newsletter) {
            await (0, digest_1.sendNewsletterEmail)(newUser, newsletter);
        }
        const digestMessage = `First Name:${firstName}\nLast Name: ${lastName}\nEmail: ${email}`;
        const msg = {
            to: "pealh0320@gmail.com",
            from: process.env.FROM_EMAIL || "",
            subject: `New User Alert`,
            text: digestMessage,
        };
        try {
            await mail_1.default.send(msg);
        }
        catch (error) {
            console.error(`❌ [Error]: Error Sending Total User count`);
        }
    }
    catch (err) {
        res.status(500).send({ code: 1, message: "Error registering user" });
    }
});
// Reset password route
app.post("/resetPassword", async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await userModel_1.User.findOne({ email });
        if (!user) {
            return res.status(200).json({ code: 1, message: "User doesn't exist" });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        // Log password change
        await (0, auditLogger_1.logActivity)(req, {
            userId: user._id.toString(),
            email: user.email,
            activityType: auditLogger_1.ActivityType.PASSWORD_CHANGED,
            activityDescription: "Password changed",
        });
        res.status(200).json({ code: 0, message: "Password updated successfully" });
    }
    catch (err) {
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
    await mail_1.default
        .send(msg)
        .then(async () => {
        // console.log("OTP successfully sent");
        res.status(200).send({ code: 0, otp: otp });
    })
        .catch((err) => {
        console.log("Error sending OTP email on /sentOTP route");
        res.status(200).send({ code: 1 });
    });
});
//Google OAuth strategy configuration
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.CLIENT || "",
    clientSecret: process.env.SECRET || "",
    callbackURL: `${process.env.SERVER}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails[0].value;
        if (!email) {
            return done(new Error("No email found"));
        }
        // Find the user by email in MongoDB
        let user = await userModel_1.User.findOne({ email });
        if (!user) {
            // If user doesn't exist, create a new user
            const firstName = profile.name?.givenName || "";
            const lastName = profile.name?.familyName || "";
            user = new userModel_1.User({
                firstName,
                lastName,
                email,
                password: "", // Empty password as the user signed up via Google OAuth
                isNewUser: false,
                time: ["Morning", "Afternoon", "Night"],
                newsletter: "Thank you for signing up. Please wait for your first newsletter to generate",
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
            const { tweetsByCategory, top15Tweets } = await (0, digest_1.fetchTweetsForCategories)([
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
            const newsletter = await (0, digest_1.generateNewsletter)(tweetsByCategory, top15Tweets);
            if (newsletter) {
                await (0, digest_1.sendNewsletterEmail)(user, newsletter);
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
                await mail_1.default.send(msg);
                await mail_1.default.send(msg2);
                await mail_1.default.send(msg3);
            }
            catch (error) {
                console.error(`❌ [Error]: Error Sending Total User count`);
            }
            return done(null, user);
        }
        else {
            // If user exists, return the user
            return done(null, user);
        }
    }
    catch (err) {
        return done(err);
    }
}));
// Google sign-up route
app.get("/auth/google/signup", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
// Google sign-in route
app.get("/auth/google/signin", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
// Google OAuth callback route
app.get("/auth/google/callback", (req, res, next) => {
    passport_1.default.authenticate("google", async (err, user, info) => {
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
        const existingUser = await userModel_1.User.findOne({ email });
        if (existingUser) {
            // If the user exists
            if (req.query.signup === "true") {
                return res.redirect(`${process.env.CLIENT_URL}/signup/?code=1&message=User%20already%20exists`);
            }
            else {
                // Generate JWT token for existing user
                const token = signJWT({
                    userId: existingUser._id.toString(),
                    email: existingUser.email,
                });
                return res.redirect(`${process.env.CLIENT_URL}/signin/?code=0&message=Login%20successful&token=${encodeURIComponent(token)}`);
            }
        }
        else {
            // If the user doesn't exist
            if (req.query.signup === "true") {
                // Generate JWT token for new user
                const token = signJWT({
                    userId: user._id.toString(),
                    email: user.email,
                });
                return res.redirect(`${process.env.CLIENT_URL}/signup/?code=0&message=Sign%20up%20successful&token=${encodeURIComponent(token)}`);
            }
            else {
                return res.redirect(`${process.env.CLIENT_URL}/signin/?code=1&message=User%20does%20not%20exist`);
            }
        }
    })(req, res, next);
});
//Redirect to Google for sign-up
app.get("/auth/google/signup", (req, res, next) => {
    req.query.signup = "true";
    passport_1.default.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});
//Redirect to Google for sign-in
app.get("/auth/google/signin", (req, res, next) => {
    // console.log("Sign in google route hits");
    req.query.signup = "false";
    passport_1.default.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
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
    const user = req.user;
    res.status(200).json({ isAuthenticated: true, email: user.email });
});
// Route to update Categories
app.post("/updateCategories", authenticateJWT, async (req, res) => {
    const { categories } = req.body;
    const userFromToken = req.user;
    try {
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email: userFromToken.email }, { categories }, { new: true });
        if (updatedUser) {
            // Log categories update
            await (0, auditLogger_1.logActivity)(req, {
                userId: userFromToken.id,
                email: userFromToken.email,
                activityType: auditLogger_1.ActivityType.CATEGORIES_UPDATED,
                activityDescription: `Updated categories: ${categories.join(", ")}`,
                metadata: { categories },
            });
            return res
                .status(200)
                .json({ code: 0, message: "Categories updated successfully" });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error updating categories:", err);
        return res
            .status(200)
            .json({ code: 1, message: "Error updating categories" });
    }
});
// Route to update Times
app.post("/updateTimes", authenticateJWT, async (req, res) => {
    const { time } = req.body;
    const userFromToken = req.user;
    try {
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email: userFromToken.email }, { time }, { new: true });
        if (updatedUser) {
            return res
                .status(200)
                .json({ code: 0, message: "Preferred time updated successfully" });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error updating time:", err);
        return res.status(200).json({ code: 1, message: "Error updating time" });
    }
});
// Public route to unsubscribe from email newsletters
app.post("/unsubscribeEmail", async (req, res) => {
    const { email } = req.body;
    try {
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email }, { time: [] }, { new: true });
        if (updatedUser) {
            return res
                .status(200)
                .json({ code: 0, message: "Unsubscribed successfully" });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error unsubscribing:", err);
        return res.status(200).json({ code: 1, message: "Error unsubscribing" });
    }
});
// Get isNewUser
app.get("/getIsNewUser", authenticateJWT, async (req, res) => {
    const userFromToken = req.user;
    try {
        const user = await userModel_1.User.findOne({ email: userFromToken.email }, "isNewUser"); // Fetch only the 'isNewUser' field
        if (user) {
            return res.status(200).json({ code: 0, isNewUser: user.isNewUser });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching isNewUser:", err);
        return res
            .status(200)
            .json({ code: 2, message: "Error fetching isNewUser" });
    }
});
// Route to access firstName, lastName, and password
app.get("/getUserDetails", authenticateJWT, async (req, res) => {
    const userFromToken = req.user;
    try {
        const user = await userModel_1.User.findOne({ email: userFromToken.email }, "firstName lastName password isAdmin"); // Fetch firstName, lastName, password, and isAdmin
        if (user) {
            return res.status(200).json({
                code: 0,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin || false,
            });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching user details:", err);
        return res
            .status(200)
            .json({ code: 2, message: "Error fetching user details" });
    }
});
// Route to update account details
app.post("/updateAccount", authenticateJWT, async (req, res) => {
    const { newFirstName, newLastName, newEmail } = req.body;
    const userFromToken = req.user;
    try {
        // Find the user by email from JWT token
        const user = await userModel_1.User.findOne({ email: userFromToken.email });
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
            const existingUser = await userModel_1.User.findOne({ email: newEmail });
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
        const finalEmail = newEmail && newEmail.trim() ? newEmail : userFromToken.email;
        const token = signJWT({
            userId: user._id.toString(),
            email: finalEmail,
        });
        // Log account update
        await (0, auditLogger_1.logActivity)(req, {
            userId: userFromToken.id,
            email: userFromToken.email,
            activityType: auditLogger_1.ActivityType.ACCOUNT_UPDATED,
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
    }
    catch (err) {
        console.log("Error updating account:", err);
        return res.status(200).json({ code: 2, message: "Error updating account" });
    }
});
// Log link click endpoint
app.post("/logLinkClick", authenticateJWT, async (req, res) => {
    try {
        const userFromToken = req.user;
        const { link, page } = req.body;
        await (0, auditLogger_1.logActivity)(req, {
            userId: userFromToken.id,
            email: userFromToken.email,
            activityType: auditLogger_1.ActivityType.LINK_CLICKED,
            activityDescription: `Clicked link: ${link}`,
            page: page || "unknown",
            metadata: { link },
        });
        res.status(200).json({ code: 0, message: "Link click logged" });
    }
    catch (error) {
        res.status(500).json({ code: 1, message: "Error logging link click" });
    }
});
// Log feedback endpoint
app.post("/logFeedback", authenticateJWT, async (req, res) => {
    try {
        const userFromToken = req.user;
        const { feedback, subject } = req.body;
        await (0, auditLogger_1.logActivity)(req, {
            userId: userFromToken.id,
            email: userFromToken.email,
            activityType: auditLogger_1.ActivityType.FEEDBACK_SENT,
            activityDescription: `Feedback sent: ${subject || "No subject"}`,
            metadata: { feedback, subject },
        });
        res.status(200).json({ code: 0, message: "Feedback logged" });
    }
    catch (error) {
        res.status(500).json({ code: 1, message: "Error logging feedback" });
    }
});
// Admin Dashboard API Endpoints
// Get page views analytics
app.get("/admin/analytics/pageviews", authenticateAdmin, async (req, res) => {
    try {
        const { period, page } = req.query;
        const { AuditLog } = await Promise.resolve().then(() => __importStar(require("./auditLogModel")));
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
        const query = {
            activityType: auditLogger_1.ActivityType.PAGE_VISIT,
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
        const grouped = {};
        pageViews.forEach((log) => {
            const date = new Date(log.createdAt).toISOString().split("T")[0];
            const pageName = log.page || "unknown";
            if (!grouped[date]) {
                grouped[date] = {};
            }
            grouped[date][pageName] = (grouped[date][pageName] || 0) + 1;
        });
        const totalViews = pageViews.length;
        const uniquePages = new Set(pageViews.map((log) => log.page)).size;
        res.status(200).json({
            code: 0,
            data: {
                totalViews,
                uniquePages,
                grouped,
                pageViews: pageViews.slice(0, 100), // Last 100 page views
            },
        });
    }
    catch (error) {
        console.error("Error fetching page views:", error);
        res.status(500).json({ code: 1, message: "Error fetching analytics" });
    }
});
// Get link clicks analytics
app.get("/admin/analytics/linkclicks", authenticateAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        const { AuditLog } = await Promise.resolve().then(() => __importStar(require("./auditLogModel")));
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
            activityType: auditLogger_1.ActivityType.LINK_CLICKED,
            createdAt: { $gte: startDate },
        })
            .sort({ createdAt: -1 })
            .select("metadata createdAt email")
            .lean();
        const totalClicks = linkClicks.length;
        const linkStats = {};
        linkClicks.forEach((log) => {
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
    }
    catch (error) {
        console.error("Error fetching link clicks:", error);
        res.status(500).json({ code: 1, message: "Error fetching analytics" });
    }
});
// Get all audit logs (live activities)
app.get("/admin/audit-logs", authenticateAdmin, async (req, res) => {
    try {
        const { userEmail, activityType, limit = 100, skip = 0 } = req.query;
        const { AuditLog } = await Promise.resolve().then(() => __importStar(require("./auditLogModel")));
        const query = {};
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
    }
    catch (error) {
        console.error("Error fetching audit logs:", error);
        res.status(500).json({ code: 1, message: "Error fetching audit logs" });
    }
});
// Get user metrics
app.get("/admin/users", authenticateAdmin, async (req, res) => {
    try {
        const users = await userModel_1.User.find({})
            .select("email wise categories profiles twitterUsername isAdmin")
            .sort({ createdAt: -1 })
            .lean();
        const userStats = {
            total: users.length,
            categorywise: users.filter((u) => u.wise === "categorywise").length,
            customProfiles: users.filter((u) => u.wise === "customProfiles")
                .length,
            withTwitter: users.filter((u) => u.twitterUsername).length,
        };
        res.status(200).json({
            code: 0,
            data: {
                users,
                stats: userStats,
            },
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ code: 1, message: "Error fetching users" });
    }
});
// Get activity statistics
app.get("/admin/analytics/activities", authenticateAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        const { AuditLog } = await Promise.resolve().then(() => __importStar(require("./auditLogModel")));
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
        const activityStats = {};
        activities.forEach((log) => {
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
    }
    catch (error) {
        console.error("Error fetching activity stats:", error);
        res.status(500).json({ code: 1, message: "Error fetching activity stats" });
    }
});
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
