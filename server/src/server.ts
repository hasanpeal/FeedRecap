import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import passport from "passport";
import db from "./db";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import cors from "cors";
import sgMail from "@sendgrid/mail";
import RedisStore from "connect-redis";
import { createClient } from "redis";
import { Client } from "pg";
import bcrypt from "bcrypt";
import Mailjet from "node-mailjet";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import mongoose from "mongoose";
import { User } from "./userModel";
import "./digest";
import { fetchTweetsForCategories, generateNewsletter, sendNewsletterEmail } from "./digest";

env.config();
const app = express();
const port = 3001;

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

// const mailjet = new Mailjet({
//   apiKey: process.env.MAIL,
//   apiSecret: process.env.MAIL_PRIVATE,
// });
// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS || "",
});
redisClient.on("error", (err: any) => console.log("Redis Client Error", err));

(async () => {
  await redisClient.connect();
  console.log("Connected to Redis");
})();

// Initialize Redis store
const redisStore = new RedisStore({
  client: redisClient,
});

// Trust the first proxy
app.set("trust proxy", 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuring cors
app.use(
  cors({
    origin: process.env.ORIGIN,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// Passport local strategy for authentication
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Incorrect email." });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  // Explicitly cast the user object to have an id property
  done(null, (user as any).id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Session setup
declare module "express-session" {
  interface SessionData {
    cookieConsent?: boolean;
  }
}

app.use(
  session({
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
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Middleware to check if user is authenticated
function isAuthenticated(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send({ code: 1, message: "Unauthorized" });
}

// Login route
app.post("/login", (req, res, next) => {
  console.log("Directed to POST Route -> /login");
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(200).json({ code: 1, message: info.message });
    req.logIn(user, (err) => {
      if (err) return next(err);
      console.log("Login success");
      return res.status(200).json({ code: 0, message: "Login successful" });
    });
  })(req, res, next);
});

// Logout route
app.post("/logout", (req, res) => {
  console.log("Directed to POST Route -> /logout");
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
      console.log("Signout successful");
      res.status(200).json({ code: 0, message: "Logout successful" });
    });
  });
});

// Validate email route
app.get("/validateEmail", async (req, res) => {
  const email: string = req.query.email as string;
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json({ code: 0, message: "Email exists" });
    } else {
      res.status(200).json({ code: 1, message: "Email does not exist" });
    }
  } catch (err) {
    res.status(500).json({ code: 1, message: "Error validating email" });
  }
});

// Check is new user
// Route to check if the user is new or not
app.get("/isNewUser", async (req, res) => {
  const email: string = req.query.email as string;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      // If the user is not found, send code 2 (indicating an error)
      return res.status(200).json({ code: 2, message: "User not found" });
    }

    // Check the value of isNewUser and send the corresponding response
    if (user.isNewUser) {
      return res.status(200).json({ code: 0, message: "User is new" });
    } else {
      return res.status(200).json({ code: 1, message: "User is not new" });
    }
  } catch (err) {
    // Handle any unexpected errors
    console.log("Error checking isNewUser:", err);
    return res.status(200).json({ code: 2, message: "Error occurred" });
  }
});

app.post("/updateUserPreferences", async (req, res) => {
  const { email, categories, time, timezone } = req.body;

  try {
    console.log(email, categories, time, timezone);
    // Find the user by email and update their categories, times, and timezone
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        categories,
        time, // Assuming 'time' refers to the array of times
        timezone,
        isNewUser: false,
      },
      { new: true } // Return the updated document
    );

    console.log(updatedUser);
    if (updatedUser) {
      // Asynchronous operation to generate and send the newsletter
      (async () => {
        try {
          // Fetch the latest tweets based on the newly updated preferences
          const { tweetsByCategory, top5Tweets } =
            await fetchTweetsForCategories(categories);

          // Generate the newsletter
          const newsletter = await generateNewsletter(
            tweetsByCategory,
            top5Tweets
          );

          if (newsletter) {
            // Send the generated newsletter to the updated user
            await sendNewsletterEmail(updatedUser, newsletter);
            console.log(`✅ [Newsletter Sent]: Newsletter sent to ${email}`);
          } else {
            console.error(
              `❌ [Newsletter Generation Error]: Failed to generate newsletter for ${email}`
            );
          }
        } catch (err) {
          console.error(
            `❌ [Error]: Error generating or sending newsletter for ${email}:`,
            err
          );
        }
      })(); // Immediately invoked async function
      
      return res
        .status(200)
        .json({ code: 0, message: "User preferences updated successfully" });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error updating user preferences:", err);
    return res
      .status(200)
      .json({ code: 1, message: "Error updating user preferences" });
  }
});

// Register route
app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).send({ code: 1, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    res.status(200).send({ code: 0, message: "User registered successfully" });
  } catch (err) {
    res.status(200).send({ code: 1, message: "Error registering user" });
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
    res.status(200).json({ code: 0, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ code: 1, message: "Error updating password" });
  }
});

// POST Route for sending OTP
app.post("/sentOTP", async (req, res) => {
  console.log("Directed to POST Route -> /sentOTP");
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
      console.log("OTP successfully sent");
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
            isNewUser: true,
            time: [],
            newsletter:
              "Thank you for signing up. Please wait for your first newsletter to generate",
            categories: [],
          });

          await user.save();
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
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.redirect(
            `${process.env.CLIENT_URL}/signin/?code=0&message=Login%20successful&email=${email}`
          );
        });
      }
    } else {
      // If the user doesn't exist
      if (req.query.signup === "true") {
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          return res.redirect(
            `${process.env.CLIENT_URL}/signup/?code=0&message=Sign%20up%20successful&email=${email}`
          );
        });
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
  console.log("Sign in google route hits");
  req.query.signup = "false";
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});









// Route to check cookie consent
app.get("/getCookieConsent", (req, res) => {
  const consent = req.session.cookieConsent;
  res.status(200).json({ code: 0, consent });
});

// Route to update cookie consent
app.post("/updateCookieConsent", (req, res) => {
  console.log("Directed to POST Route -> /updateCookieConsent");
  const { consent } = req.body;

  // Store consent in session
  req.session.cookieConsent = consent;

  res.status(200).json({ code: 0, message: "Cookie consent updated" });
});

// Check session route
app.get("/check-session", (req, res) => {
  console.log("Directed to get route to check session");
  if (req.isAuthenticated()) {
    console.log("User is authenticated");
    const user = req.user as { email: string };
    const email = user.email;
    res.status(200).json({ isAuthenticated: true, email });
  } else {
    console.log("User is not authenticated");
    res.status(200).json({ isAuthenticated: false });
  }
});

// Get Total Newsletters
app.get("/getTotalNewsletters", async (req, res) => {
  console.log("/getTotalNewsletters");
  const email: string = req.query.email as string;

  try {
    const user = await User.findOne({ email }, "totalnewsletter"); // Fetch only the 'totalnewsletter' field
    if (user) {
      return res
        .status(200)
        .json({ code: 0, totalnewsletter: user.totalnewsletter });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error fetching total newsletters:", err);
    return res
      .status(200)
      .json({ code: 2, message: "Error fetching total newsletters" });
  }
});

// Get Categories array
app.get("/getCategories", async (req, res) => {
  console.log("/getCategories");
  const email: string = req.query.email as string;

  try {
    const user = await User.findOne({ email }, "categories"); // Fetch only the 'categories' field
    if (user) {
      return res.status(200).json({ code: 0, categories: user.categories });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error fetching categories:", err);
    return res
      .status(200)
      .json({ code: 2, message: "Error fetching categories" });
  }
});

// Get Times array
app.get("/getTimes", async (req, res) => {
  console.log("/getTimes");
  const email: string = req.query.email as string;

  try {
    const user = await User.findOne({ email }, "time"); // Fetch only the 'time' field
    if (user) {
      return res.status(200).json({ code: 0, time: user.time });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error fetching times:", err);
    return res.status(200).json({ code: 2, message: "Error fetching times" });
  }
});

// Get Timezone
app.get("/getTimezone", async (req, res) => {
  console.log("/getTimezone");
  const email: string = req.query.email as string;

  try {
    const user = await User.findOne({ email }, "timezone"); // Fetch only the 'timezone' field
    if (user) {
      return res.status(200).json({ code: 0, timezone: user.timezone });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error fetching timezone:", err);
    return res
      .status(200)
      .json({ code: 2, message: "Error fetching timezone" });
  }
});

// Get Newsletter
app.get("/getNewsletter", async (req, res) => {
  console.log("/getNewsletter");
  const email: string = req.query.email as string;

  try {
    const user = await User.findOne({ email }, "newsletter"); // Fetch only the 'newsletter' field
    if (user) {
      return res.status(200).json({ code: 0, newsletter: user.newsletter });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error fetching newsletter:", err);
    return res
      .status(200)
      .json({ code: 2, message: "Error fetching newsletter" });
  }
});

// Route to update Categories
app.post("/updateCategories", async (req, res) => {
  console.log("/updateCategories");
  const { email, categories } = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { categories },
      { new: true }
    );

    if (updatedUser) {
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
  console.log("/updateTimes");
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

// Route to update Timezone
app.post("/updateTimezone", async (req, res) => {
  console.log("/updateTimezone");
  const { email, timezone } = req.body;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { timezone },
      { new: true }
    );

    if (updatedUser) {
      return res
        .status(200)
        .json({ code: 0, message: "Timezone updated successfully" });
    } else {
      return res.status(200).json({ code: 1, message: "User not found" });
    }
  } catch (err) {
    console.log("Error updating timezone:", err);
    return res
      .status(200)
      .json({ code: 1, message: "Error updating timezone" });
  }
});

// Get isNewUser
app.get("/getIsNewUser", async (req, res) => {
  console.log("/getIsNewUser");
  const email: string = req.query.email as string;

  try {
    const user = await User.findOne({ email }, "isNewUser"); // Fetch only the 'isNewUser' field
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

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
