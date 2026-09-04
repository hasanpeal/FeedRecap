import passport from "passport";
import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
} from "../services/newsletter.service";
import { ADMIN_ALERT_RECIPIENTS, sendAdminAlert } from "../services/email.service";
import "./env";

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

// Google OAuth strategy configuration
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

          await sendAdminAlert(
            ADMIN_ALERT_RECIPIENTS,
            `New User Alert`,
            digestMessage
          );
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

export default passport;
