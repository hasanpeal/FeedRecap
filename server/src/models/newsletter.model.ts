import mongoose, { Schema, Document } from "mongoose";
import db from "../config/db";

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

// TTL index: MongoDB's background TTL monitor deletes a newsletter 7 days
// after it was sent, so /readnewsletter links and the newsletters collection
// don't grow forever. No app-level cron needed — this runs even if the
// server is down.
NewsletterSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

// Create the Newsletter model
const Newsletter = db.model<INewsletter>("Newsletter", NewsletterSchema);

export { Newsletter, NewsletterSchema };
