import "./config/env";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import passport from "passport";
import "./config/passport";
import { stopBackgroundJobs } from "./jobs";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import newsletterRoutes from "./routes/newsletter.routes";
import activityRoutes from "./routes/activity.routes";
import adminRoutes from "./routes/admin.routes";
import contactRoutes from "./routes/contact.routes";

const app = express();

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

process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing gracefully.");
  try {
    await stopBackgroundJobs();
  } catch (error) {
    console.error("Error closing background jobs:", error);
  }
  process.exit(0);
});

// Passport is only used for OAuth, not for session management
app.use(passport.initialize());

// Use JWT authentication middleware instead of session-based
app.use(authRoutes);
app.use(userRoutes);
app.use(newsletterRoutes);
app.use(activityRoutes);
app.use(adminRoutes);
app.use(contactRoutes);

export default app;
