import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { User } from "../models/userModel";
import { fetchTweetsForCategories } from "../services/twitterService";
import { generateNewsletter } from "../services/newsletterService";
import { sendNewsletterEmail, sendAdminAlert, ADMIN_EMAILS } from "../services/emailService";

const DEFAULT_CATEGORIES = [
  "Politics",
  "Geopolitics",
  "Finance",
  "AI",
  "Tech",
  "Crypto",
  "Meme",
  "Sports",
  "Entertainment",
];

// Registers the Local and Google passport strategies. Called once at
// startup; route handlers then just call `passport.authenticate(...)`.
export function configurePassport(): void {
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
              categories: DEFAULT_CATEGORIES,
            });

            await user.save();
            const { tweetsByCategory, top15Tweets } =
              await fetchTweetsForCategories(DEFAULT_CATEGORIES);
            const newsletter = await generateNewsletter(
              tweetsByCategory,
              top15Tweets
            );
            if (newsletter) {
              await sendNewsletterEmail(user, newsletter);
            }
            const digestMessage = `First Name:${firstName}\nLast Name: ${lastName}\nEmail: ${email}`;

            await sendAdminAlert(`New User Alert`, digestMessage, [
              ADMIN_EMAILS.owner,
              ADMIN_EMAILS.team,
              ADMIN_EMAILS.support,
            ]);
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
}
