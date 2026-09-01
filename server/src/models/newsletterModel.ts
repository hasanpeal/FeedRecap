import mongoose, { Schema, Document } from "mongoose";
import db from "../config/db"; // Assuming db is the primary database connection

// Define the Newsletter interface
export interface INewsletter extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User who received the newsletter
  content: string; // The newsletter content
  createdAt: Date; // Timestamp for when the newsletter was created
}

// Define the Newsletter schema
const NewsletterSchema: Schema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Supports "latest newsletter for user" lookups (findOne({user}).sort({createdAt:-1}))
NewsletterSchema.index({ user: 1, createdAt: -1 });

// Retention: auto-delete newsletters 7 days after they were sent, so this
// collection doesn't grow forever. Note this also expires the "Read &
// Share" links emailed to users, which stop resolving after 7 days.
NewsletterSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

// Create the Newsletter model
const Newsletter = db.model<INewsletter>("Newsletter", NewsletterSchema);

export {Newsletter, NewsletterSchema};
