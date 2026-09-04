import mongoose, { Document, Schema } from "mongoose";
import db from "../config/db";

// Bookmarks only store the post link (not full content), since posts
// older than 7 days are deleted from StoredTweets/CustomProfilePosts.
export interface IBookmark extends Document {
  user: mongoose.Types.ObjectId;
  tweetId: string;
  link: string;
  username?: string;
  createdAt: Date;
}

const BookmarkSchema: Schema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tweetId: { type: String, required: true },
  link: { type: String, required: true },
  username: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});

BookmarkSchema.index({ user: 1, tweetId: 1 }, { unique: true });

export const Bookmark = db.model<IBookmark>("Bookmark", BookmarkSchema);
