import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import passport from "passport";
import cors from "cors";
import db from "./config/db";
import dbTweet from "./config/dbTweet";
import { configurePassport } from "./config/passport";
import { startBackgroundJobs } from "./jobs";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import newsletterRoutes from "./routes/newsletterRoutes";
import activityRoutes from "./routes/activityRoutes";
import adminRoutes from "./routes/adminRoutes";

env.config();

const app = express();
const port = 3001;

// Trust the first proxy
app.set("trust proxy", 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  cors({
    origin: [process.env.ORIGIN || "", process.env.ORIGINTEST || ""],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// Passport is only used for OAuth strategies, not session management
configurePassport();
app.use(passport.initialize());

app.use(authRoutes);
app.use(userRoutes);
app.use(newsletterRoutes);
app.use(activityRoutes);
app.use("/admin", adminRoutes);

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing gracefully.");
  try {
    await Promise.all([db.close(), dbTweet.close()]);
  } catch (error) {
    console.error("Error closing database connections:", error);
  }
  process.exit(0);
});

startBackgroundJobs();

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
