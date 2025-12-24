"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const express_session_1 = __importDefault(require("express-session"));
const cors_1 = __importDefault(require("cors"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const crypto_1 = __importDefault(require("crypto"));
const userModel_1 = require("./userModel");
require("./digest");
const newsletterModel_1 = require("./newsletterModel");
const digest_1 = require("./digest");
const tweetModel_1 = require("./tweetModel");
dotenv_1.default.config();
// Encryption/Decryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto_1.default.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;
function getKeyFromPassword(password, salt) {
    return crypto_1.default.pbkdf2Sync(password, salt, 100000, 32, "sha512");
}
function encrypt(text) {
    const salt = crypto_1.default.randomBytes(SALT_LENGTH);
    const key = getKeyFromPassword(ENCRYPTION_KEY, salt);
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    // Combine salt + iv + tag + encrypted
    return (salt.toString("hex") + iv.toString("hex") + tag.toString("hex") + encrypted);
}
function decrypt(encryptedData) {
    const salt = Buffer.from(encryptedData.slice(0, SALT_LENGTH * 2), "hex");
    const iv = Buffer.from(encryptedData.slice(SALT_LENGTH * 2, TAG_POSITION * 2), "hex");
    const tag = Buffer.from(encryptedData.slice(TAG_POSITION * 2, ENCRYPTED_POSITION * 2), "hex");
    const encrypted = encryptedData.slice(ENCRYPTED_POSITION * 2);
    const key = getKeyFromPassword(ENCRYPTION_KEY, salt);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
const app = (0, express_1.default)();
const port = 3001;
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY || "");
// MongoDB session store setup
const mongoStore = connect_mongo_1.default.create({
    mongoUrl: `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@user.44ggn.mongodb.net/?retryWrites=true&w=majority&appName=user`,
    collectionName: "sessions",
    ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    autoRemove: "native", // Use MongoDB's TTL index
});
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
// Middleware to handle raw body for webhook
app.use((req, res, next) => {
    // Allow Google OAuth redirects to pass through without origin/referer checks
    if (req.path && req.path.startsWith("/auth/google/")) {
        return next();
    }
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    // For same-origin requests, origin will be undefined, so we check referer
    if (!origin && referer) {
        const refererUrl = new URL(referer);
        const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
        if (refererOrigin === process.env.ORIGIN) {
            return express_1.default.json()(req, res, next);
        }
    }
    // For cross-origin requests, check origin
    if (origin === process.env.ORIGIN) {
        return express_1.default.json()(req, res, next);
    }
    console.log(`🚫 Blocked request - Origin: ${origin}, Referer: ${referer}`);
    return res
        .status(403)
        .json({ error: "Forbidden: Invalid origin or referer" });
});
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
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await userModel_1.User.findById(id);
        done(null, user);
    }
    catch (err) {
        done(err);
    }
});
app.use((0, express_session_1.default)({
    store: mongoStore,
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none",
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).send({ code: 1, message: "Unauthorized" });
}
app.get("/data", async (req, res) => {
    const { email } = req.query;
    if (!email) {
        return res
            .status(400)
            .json({ error: "Email query parameter is required", code: 1 });
    }
    try {
        // Fetch user data
        const user = await userModel_1.User.findOne({ email }).select("categories time timezone newsletter wise profiles twitterUsername");
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
app.post("/unlinkX", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: "Email is required" });
        await userModel_1.User.findOneAndUpdate({ email }, { twitterUsername: null });
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
        await userModel_1.User.findOneAndUpdate({ email }, { twitterUsername });
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
        return res.status(200).json({ code: 0, newsletter: newsletter.content });
    }
    catch (error) {
        console.error("Error fetching newsletter:", error);
        res.status(500).send("Internal Server Error");
    }
});
app.post("/updateProfiles", async (req, res) => {
    const { email, profiles } = req.body;
    try {
        // Fetch the current user
        const user = await userModel_1.User.findOne({ email });
        if (!user) {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
        // Get the current profiles
        const currentProfiles = user.profiles || [];
        // Find newly added profiles
        const changedProfiles = profiles.filter((profile) => !currentProfiles.includes(profile));
        // Update the user's profiles in the database
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email }, { profiles }, { new: true });
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
app.post("/updateFeedType", async (req, res) => {
    const { email, wise, categories, profiles } = req.body;
    if (!email || !wise) {
        return res
            .status(400)
            .json({ error: "Email and feed type (wise) are required", code: 1 });
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
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email }, { wise, categories, profiles }, { new: true } // Return the updated document
        );
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found", code: 1 });
        }
        // Trigger appropriate fetching logic
        if (wise === "customProfiles") {
            await (0, digest_1.fetchAndStoreTweetsForProfiles)(updatedUser.profiles); // Fetch tweets for followed profiles
        }
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
// Login route
app.post("/login", (req, res, next) => {
    passport_1.default.authenticate("local", (err, user, info) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(401).json({ code: 1, message: info.message });
        req.logIn(user, (err) => {
            if (err)
                return next(err);
            // Encrypt the email before returning
            const encryptedEmail = encrypt(user.email);
            return res.status(200).json({
                code: 0,
                message: "Login successful",
                encryptedEmail,
            });
        });
    })(req, res, next);
});
// Logout route
app.post("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(200).json({ code: 1, message: "Error logging out" });
        }
        req.session.destroy((err) => {
            if (err) {
                return res
                    .status(200)
                    .json({ code: 1, message: "Error destroying session" });
            }
            // console.log("Signout successful");
            res.status(200).json({ code: 0, message: "Logout successful" });
        });
    });
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
        // Encrypt the email before returning
        const encryptedEmail = encrypt(email);
        res.status(201).send({
            code: 0,
            message: "User registered successfully",
            encryptedEmail,
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
        // Encrypt the email for the redirect URL
        const encryptedEmail = encrypt(email);
        // Check if the user already exists in MongoDB
        const existingUser = await userModel_1.User.findOne({ email });
        if (existingUser) {
            // If the user exists
            if (req.query.signup === "true") {
                return res.redirect(`${process.env.CLIENT_URL}/signup/?code=1&message=User%20already%20exists`);
            }
            else {
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }
                    return res.redirect(`${process.env.CLIENT_URL}/signin/?code=0&message=Login%20successful&token=${encodeURIComponent(encryptedEmail)}`);
                });
            }
        }
        else {
            // If the user doesn't exist
            if (req.query.signup === "true") {
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }
                    return res.redirect(`${process.env.CLIENT_URL}/signup/?code=0&message=Sign%20up%20successful&token=${encodeURIComponent(encryptedEmail)}`);
                });
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
// Route to check cookie consent
app.get("/getCookieConsent", (req, res) => {
    const consent = req.session.cookieConsent;
    res.status(200).json({ code: 0, consent });
});
// Route to update cookie consent
app.post("/updateCookieConsent", (req, res) => {
    const { consent } = req.body;
    // Store consent in session
    req.session.cookieConsent = consent;
    res.status(200).json({ code: 0, message: "Cookie consent updated" });
});
// Check session route
app.get("/check-session", (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        const email = user.email;
        res.status(200).json({ isAuthenticated: true, email });
    }
    else {
        res.status(200).json({ isAuthenticated: false });
    }
});
// Decrypt email token route
app.post("/decrypt-email", async (req, res) => {
    try {
        const { encryptedToken } = req.body;
        if (!encryptedToken) {
            return res
                .status(400)
                .json({ code: 1, message: "Encrypted token is required" });
        }
        const email = decrypt(encryptedToken);
        // Validate that the email exists in the database
        // This prevents decryption of tokens for non-existent users
        const user = await userModel_1.User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                code: 1,
                message: "Invalid token - user not found",
            });
        }
        res.status(200).json({ code: 0, email });
    }
    catch (error) {
        console.error("Error decrypting email:", error);
        res.status(400).json({ code: 1, message: "Invalid or corrupted token" });
    }
});
// Route to update Categories
app.post("/updateCategories", async (req, res) => {
    // console.log("/updateCategories");
    const { email, categories } = req.body;
    try {
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email }, { categories }, { new: true });
        if (updatedUser) {
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
app.post("/updateTimes", async (req, res) => {
    const { email, time } = req.body;
    try {
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email }, { time }, { new: true });
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
// Get isNewUser
app.get("/getIsNewUser", async (req, res) => {
    // console.log("/getIsNewUser");
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "isNewUser"); // Fetch only the 'isNewUser' field
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
// Logout route that removes cookies
app.post("/logout", (req, res) => {
    // console.log("Directed to POST Route -> /logout");
    req.logout((err) => {
        if (err) {
            return res.status(200).json({ code: 1, message: "Error logging out" });
        }
        // Clear the session cookie
        res.clearCookie("connect.sid", {
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                return res
                    .status(200)
                    .json({ code: 1, message: "Error destroying session" });
            }
            // console.log("Signout successful and cookies cleared");
            res
                .status(200)
                .json({ code: 0, message: "Logout successful, cookies cleared" });
        });
    });
});
// Route to access firstName, lastName, and password
app.get("/getUserDetails", async (req, res) => {
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "firstName lastName password"); // Fetch firstName, lastName, and password
        if (user) {
            return res.status(200).json({
                code: 0,
                firstName: user.firstName,
                lastName: user.lastName,
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
app.post("/updateAccount", async (req, res) => {
    const { email, newFirstName, newLastName, newEmail } = req.body;
    // console.log(email, newFirstName, newLastName, newEmail);
    try {
        // Find the user by current email
        const user = await userModel_1.User.findOne({ email });
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
        // Return encrypted token for the updated email
        const finalEmail = newEmail && newEmail.trim() ? newEmail : email;
        const encryptedEmail = encrypt(finalEmail);
        return res.status(200).json({
            code: 0,
            message: "Account updated successfully",
            encryptedEmail,
        });
    }
    catch (err) {
        console.log("Error updating account:", err);
        return res.status(200).json({ code: 2, message: "Error updating account" });
    }
});
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
