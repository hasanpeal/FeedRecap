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
const connect_redis_1 = __importDefault(require("connect-redis"));
const redis_1 = require("redis");
const bcrypt_1 = __importDefault(require("bcrypt"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const userModel_1 = require("./userModel");
require("./digest");
const newsletterModel_1 = require("./newsletterModel");
const digest_1 = require("./digest");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3001;
mail_1.default.setApiKey(process.env.SENDGRID_API_KEY || "");
// Redis client setup
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS || "",
});
redisClient.on("error", (err) => console.log("Redis Client Error", err));
(async () => {
    await redisClient.connect();
    console.log("Connected to Redis");
})();
// Initialize Redis store
const redisStore = new connect_redis_1.default({
    client: redisClient,
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
    // Explicitly cast the user object to have an id property
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
    store: redisStore,
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
        const user = await userModel_1.User.findOne({ email }).select("categories time timezone newsletter wise profiles");
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 1 });
        }
        let posts = [];
        if (user.wise === "categorywise") {
            // Fetch posts based on category-wise selection
            const categoryPosts = await digest_1.StoredTweets.find({
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
            const profilePosts = await digest_1.CustomProfilePosts.find({
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
// Route to get posts by user-selected categories
app.get("/api/posts", async (req, res) => {
    // console.log("Posts routes called");
    const { email } = req.query;
    if (!email) {
        return res
            .status(400)
            .json({ error: "Email query parameter is required", code: 1 });
    }
    try {
        // Fetch the user by email to get their selected categories
        const user = await userModel_1.User.findOne({ email }).select("categories");
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 1 });
        }
        const selectedCategories = user.categories;
        // Fetch posts from StoredTweets based on user's selected categories
        const posts = await digest_1.StoredTweets.find({
            category: { $in: selectedCategories },
        }).select("screenName createdAt tweets category avatar");
        // console.log("Posts coming from server", posts)
        // Format the data to return an array of tweets with necessary fields
        const formattedPosts = posts.flatMap((post) => {
            return post.tweets.map((tweet) => ({
                username: post.screenName,
                time: tweet.createdAt,
                likes: tweet.likes,
                category: post.category,
                text: tweet.text,
                avatar: post.avatar,
                tweet_id: tweet.tweet_id,
            }));
        });
        // Respond with the formatted data, adding code: 0 to indicate success
        res.status(200).json({ data: formattedPosts, code: 0 });
    }
    catch (error) {
        console.error("Error fetching posts:", error);
        res
            .status(500)
            .json({ error: "An error occurred while fetching posts", code: 1 });
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
        const profilePosts = await digest_1.CustomProfilePosts.find({
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
app.get("/getProfiles", async (req, res) => {
    const { email } = req.query;
    try {
        const user = await userModel_1.User.findOne({ email }).select("profiles").exec();
        if (user) {
            return res.status(200).json({
                code: 0,
                profiles: user.profiles || [],
            });
        }
        else {
            return res.status(200).json({
                code: 1,
                message: "User not found",
            });
        }
    }
    catch (err) {
        console.error("Error fetching profiles:", err);
        return res.status(200).json({
            code: 1,
            message: "Error fetching profiles",
        });
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
    }
    catch (error) {
        console.error("Error updating feed type:", error);
        res
            .status(500)
            .json({ error: "An error occurred while updating feed type", code: 1 });
    }
});
app.get("/getWise", async (req, res) => {
    const { email } = req.query;
    try {
        const user = await userModel_1.User.findOne({ email }).select("wise").exec();
        // console.log("users wise", user?.wise)
        if (user) {
            return res.status(200).json({
                code: 0,
                wise: user.wise,
            });
        }
        else {
            return res.status(200).json({
                code: 1,
                message: "User not found",
            });
        }
    }
    catch (err) {
        console.error("Error fetching feed type (wise):", err);
        return res.status(200).json({
            code: 1,
            message: "Error fetching feed type (wise)",
        });
    }
});
// Route to get posts by user-selected custom profiles
app.get("/api/customPosts", async (req, res) => {
    // console.log("Custom Posts route");
    const { email } = req.query;
    if (!email) {
        return res
            .status(400)
            .json({ error: "Email query parameter is required", code: 1 });
    }
    try {
        // Fetch the user by email to get their selected profiles
        const user = await userModel_1.User.findOne({ email }).select("profiles");
        if (!user) {
            return res.status(404).json({ error: "User not found", code: 1 });
        }
        const selectedProfiles = user.profiles;
        if (!selectedProfiles || selectedProfiles.length === 0) {
            return res
                .status(200)
                .json({ data: [], message: "No custom profiles selected", code: 0 });
        }
        // Fetch posts from CustomProfilePosts based on user's selected custom profiles
        const posts = await digest_1.CustomProfilePosts.find({
            screenName: { $in: selectedProfiles },
        }).select("screenName tweets avatar");
        // Format the data to return an array of tweets with necessary fields
        const formattedPosts = posts.flatMap((post) => post.tweets.map((tweet) => ({
            username: post.screenName,
            time: tweet.createdAt, // Use the `createdAt` from the tweet object
            likes: tweet.likes,
            text: tweet.text,
            avatar: post.avatar,
            tweet_id: tweet.tweet_id,
        })));
        // Respond with the formatted data, adding code: 0 to indicate success
        res.status(200).json({ data: formattedPosts, code: 0 });
    }
    catch (error) {
        console.error("Error fetching custom posts:", error);
        res.status(500).json({
            error: "An error occurred while fetching custom posts",
            code: 1,
        });
    }
});
// Login route
app.post("/login", (req, res, next) => {
    // console.log("Directed to POST Route -> /login");
    passport_1.default.authenticate("local", (err, user, info) => {
        if (err)
            return next(err);
        if (!user)
            return res.status(200).json({ code: 1, message: info.message });
        req.logIn(user, (err) => {
            if (err)
                return next(err);
            // console.log("Login success");
            return res.status(200).json({ code: 0, message: "Login successful" });
        });
    })(req, res, next);
});
// Logout route
app.post("/logout", (req, res) => {
    // console.log("Directed to POST Route -> /logout");
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
            res.status(200).json({ code: 1, message: "Email does not exist" });
        }
    }
    catch (err) {
        res.status(500).json({ code: 1, message: "Error validating email" });
    }
});
// Check is new user
// Route to check if the user is new or not
app.get("/isNewUser", async (req, res) => {
    const email = req.query.email;
    try {
        // Find the user by email
        const user = await userModel_1.User.findOne({ email });
        if (!user) {
            // If the user is not found, send code 2 (indicating an error)
            return res.status(200).json({ code: 2, message: "User not found" });
        }
        // Check the value of isNewUser and send the corresponding response
        if (user.isNewUser) {
            return res.status(200).json({ code: 0, message: "User is new" });
        }
        else {
            return res.status(200).json({ code: 1, message: "User is not new" });
        }
    }
    catch (err) {
        // Handle any unexpected errors
        // console.log("Error checking isNewUser:", err);
        return res.status(200).json({ code: 2, message: "Error occurred" });
    }
});
// app.post("/updateUserPreferences", async (req, res) => {
//   const { email, categories, time, timezone } = req.body;
//   try {
//     console.log(email, categories, time, timezone);
//     // Find the user by email and update their categories, times, and timezone
//     const updatedUser = await User.findOneAndUpdate(
//       { email },
//       {
//         categories,
//         time, // Assuming 'time' refers to the array of times
//         timezone,
//         isNewUser: false,
//       },
//       { new: true } // Return the updated document
//     );
//     console.log(updatedUser);
//     if (updatedUser) {
//       // Asynchronous operation to generate and send the newsletter
//       (async () => {
//         try {
//           // Fetch the latest tweets based on the newly updated preferences
//           const { tweetsByCategory, top15Tweets } =
//             await fetchTweetsForCategories(categories);
//           // Generate the newsletter
//           const newsletter = await generateNewsletter(
//             tweetsByCategory,
//             top15Tweets
//           );
//           if (newsletter) {
//             // Send the generated newsletter to the updated user
//             await sendNewsletterEmail(updatedUser, newsletter);
//             console.log(`✅ [Newsletter Sent]: Newsletter sent to ${email}`);
//           } else {
//             console.error(
//               `❌ [Newsletter Generation Error]: Failed to generate newsletter for ${email}`
//             );
//           }
//         } catch (err) {
//           console.error(
//             `❌ [Error]: Error generating or sending newsletter for ${email}:`,
//             err
//           );
//         }
//       })(); // Immediately invoked async function
//       return res
//         .status(200)
//         .json({ code: 0, message: "User preferences updated successfully" });
//     } else {
//       return res.status(200).json({ code: 1, message: "User not found" });
//     }
//   } catch (err) {
//     console.log("Error updating user preferences:", err);
//     return res
//       .status(200)
//       .json({ code: 1, message: "Error updating user preferences" });
//   }
// });
// app.post("/updateUserPreferences", async (req, res) => {
//   const { email, categories, time, timezone, wise, profiles } = req.body;
//   try {
//     // console.log(email, categories, time, timezone, wise, profiles);
//     // Define fields to update dynamically
//     const updateFields: any = {
//       time, // Update time preferences
//       timezone, // Update timezone
//       wise, // Update feed type (categorywise or customProfiles)
//       isNewUser: false, // Mark user as no longer new
//     };
//     // Handle categorywise and customProfiles cases
//     if (wise === "categorywise") {
//       updateFields.categories = categories || []; // Update categories
//       updateFields.profiles = []; // Clear profiles if switching to categorywise
//     } else if (wise === "customProfiles") {
//       updateFields.profiles = profiles || []; // Update profiles
//       updateFields.categories = []; // Clear categories if switching to customProfiles
//     }
//     // Update user preferences in the database
//     const updatedUser = await User.findOneAndUpdate(
//       { email },
//       updateFields,
//       { new: true } // Return the updated document
//     );
//     // console.log(updatedUser);
//     if (updatedUser) {
//       // Asynchronous operation to generate and send the newsletter
//       if (wise === "categorywise") {
//         (async () => {
//           try {
//             // Fetch the latest tweets based on the updated categories
//             const { tweetsByCategory, top15Tweets } =
//               await fetchTweetsForCategories(categories);
//             // Generate the newsletter
//             const newsletter = await generateNewsletter(
//               tweetsByCategory,
//               top15Tweets
//             );
//             if (newsletter) {
//               // Send the generated newsletter to the updated user
//               await sendNewsletterEmail(updatedUser, newsletter);
//               // console.log(`✅ [Newsletter Sent]: Newsletter sent to ${email}`);
//             } else {
//               console.error(
//                 `❌ [Newsletter Generation Error]: Failed to generate newsletter for ${email}`
//               );
//             }
//           } catch (err) {
//             console.error(
//               `❌ [Error]: Error generating or sending newsletter for ${email}:`,
//               err
//             );
//           }
//         })(); // Immediately invoked async function
//       }
//       // Leave customProfiles implementation to you
//       if (wise === "customProfiles") {
//         (async () => {
//           try {
//             // Fetch the latest tweets for the selected profiles
//             const { tweetsByProfiles, top15Tweets } =
//               await fetchTweetsForProfiles(
//                 profiles,
//                 updatedUser._id as mongoose.Types.ObjectId
//               );
//             // Generate the newsletter for custom profiles
//             const newsletter = await generateCustomProfileNewsletter(
//               tweetsByProfiles,
//               top15Tweets
//             );
//             if (newsletter) {
//               // Send the generated newsletter to the updated user
//               await sendNewsletterEmail(updatedUser, newsletter);
//               // console.log(
//               //   `✅ [Newsletter Sent]: Custom profiles newsletter sent to ${email}`
//               // );
//             } else {
//               console.error(
//                 `❌ [Newsletter Generation Error]: Failed to generate custom profiles newsletter for ${email}`
//               );
//             }
//           } catch (err) {
//             console.error(
//               `❌ [Error]: Error generating or sending custom profiles newsletter for ${email}:`,
//               err
//             );
//           }
//         })(); // Immediately invoked async function
//       }
//       return res
//         .status(200)
//         .json({ code: 0, message: "User preferences updated successfully" });
//     } else {
//       return res.status(200).json({ code: 1, message: "User not found" });
//     }
//   } catch (err) {
//     console.error("Error updating user preferences:", err);
//     return res
//       .status(500)
//       .json({ code: 1, message: "Error updating user preferences" });
//   }
// });
// Register route
app.post("/register", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        const existingUser = await userModel_1.User.findOne({ email });
        if (existingUser) {
            return res.status(200).send({ code: 1, message: "User already exists" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = new userModel_1.User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        res.status(200).send({ code: 0, message: "User registered successfully" });
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
        res.status(200).send({ code: 1, message: "Error registering user" });
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
                isNewUser: true,
                time: [],
                newsletter: "Thank you for signing up. Please wait for your first newsletter to generate",
                categories: [],
            });
            await user.save();
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
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err);
                    }
                    return res.redirect(`${process.env.CLIENT_URL}/signin/?code=0&message=Login%20successful&email=${email}`);
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
                    return res.redirect(`${process.env.CLIENT_URL}/signup/?code=0&message=Sign%20up%20successful&email=${email}`);
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
    // console.log("Directed to POST Route -> /updateCookieConsent");
    const { consent } = req.body;
    // Store consent in session
    req.session.cookieConsent = consent;
    res.status(200).json({ code: 0, message: "Cookie consent updated" });
});
// Check session route
app.get("/check-session", (req, res) => {
    // console.log("Directed to get route to check session");
    if (req.isAuthenticated()) {
        // console.log("User is authenticated");
        const user = req.user;
        const email = user.email;
        res.status(200).json({ isAuthenticated: true, email });
    }
    else {
        // console.log("User is not authenticated");
        res.status(200).json({ isAuthenticated: false });
    }
});
// Get Total Newsletters
app.get("/getTotalNewsletters", async (req, res) => {
    // console.log("/getTotalNewsletters");
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "totalnewsletter"); // Fetch only the 'totalnewsletter' field
        if (user) {
            return res
                .status(200)
                .json({ code: 0, totalnewsletter: user.totalnewsletter });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching total newsletters:", err);
        return res
            .status(200)
            .json({ code: 2, message: "Error fetching total newsletters" });
    }
});
// Get Categories array
app.get("/getCategories", async (req, res) => {
    // console.log("/getCategories");
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "categories"); // Fetch only the 'categories' field
        if (user) {
            return res.status(200).json({ code: 0, categories: user.categories });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching categories:", err);
        return res
            .status(200)
            .json({ code: 2, message: "Error fetching categories" });
    }
});
// Get Times array
app.get("/getTimes", async (req, res) => {
    // console.log("/getTimes");
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "time"); // Fetch only the 'time' field
        if (user) {
            return res.status(200).json({ code: 0, time: user.time });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching times:", err);
        return res.status(200).json({ code: 2, message: "Error fetching times" });
    }
});
// Get Timezone
app.get("/getTimezone", async (req, res) => {
    // console.log("/getTimezone");
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "timezone"); // Fetch only the 'timezone' field
        if (user) {
            return res.status(200).json({ code: 0, timezone: user.timezone });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching timezone:", err);
        return res
            .status(200)
            .json({ code: 2, message: "Error fetching timezone" });
    }
});
// Get Newsletter
app.get("/getNewsletter", async (req, res) => {
    // console.log("/getNewsletter");
    const email = req.query.email;
    try {
        const user = await userModel_1.User.findOne({ email }, "newsletter"); // Fetch only the 'newsletter' field
        if (user) {
            return res.status(200).json({ code: 0, newsletter: user.newsletter });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error fetching newsletter:", err);
        return res
            .status(200)
            .json({ code: 2, message: "Error fetching newsletter" });
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
    // console.log("/updateTimes");
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
// Route to update Timezone
app.post("/updateTimezone", async (req, res) => {
    // console.log("/updateTimezone");
    const { email, timezone } = req.body;
    try {
        const updatedUser = await userModel_1.User.findOneAndUpdate({ email }, { timezone }, { new: true });
        if (updatedUser) {
            return res
                .status(200)
                .json({ code: 0, message: "Timezone updated successfully" });
        }
        else {
            return res.status(200).json({ code: 1, message: "User not found" });
        }
    }
    catch (err) {
        console.log("Error updating timezone:", err);
        return res
            .status(200)
            .json({ code: 1, message: "Error updating timezone" });
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
        return res
            .status(200)
            .json({ code: 0, message: "Account updated successfully" });
    }
    catch (err) {
        console.log("Error updating account:", err);
        return res.status(200).json({ code: 2, message: "Error updating account" });
    }
});
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
