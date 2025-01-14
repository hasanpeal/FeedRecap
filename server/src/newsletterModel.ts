import mongoose, { Schema, Document } from "mongoose";
import db from "./db"; // Assuming db is the primary database connection

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

// Create the Newsletter model
const Newsletter = db.model<INewsletter>("Newsletter", NewsletterSchema);

export {Newsletter, NewsletterSchema};
