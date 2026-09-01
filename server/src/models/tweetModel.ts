import mongoose, { Document, Schema } from "mongoose";
import db from "../config/db";
import dbTweet from "../config/dbTweet";

// MongoDB Tweet Document Interface for Category POSTS
export interface ITweet extends Document {
  category: string;
  screenName: string;
  avatar: string;
  tweets: {
    text: string;
    likes: number;
    tweet_id: string;
    createdAt: Date;
    mediaThumbnail: string;
    video: string;
    videoThumbnail: string; // ✅ Stores video preview thumbnail
    quotedTweet: {
      tweet_id: string;
      text: string;
      likes: number;
      createdAt: Date;
      mediaThumbnail: string;
      video: string;
      videoThumbnail: string;
      avatar: string;
      screenName: string;
    };
  }[];
  createdAt: Date;
}

// Tweet Schema for category posts
export const tweetSchema: Schema = new mongoose.Schema({
  category: { type: String, required: true },
  screenName: { type: String, required: true },
  avatar: { type: String, required: false },
  tweets: [
    {
      text: { type: String, required: true },
      likes: { type: Number, required: true },
      tweet_id: { type: String, required: true },
      createdAt: { type: Date, required: true },
      mediaThumbnail: { type: String, required: false },
      video: { type: String, required: false },
      videoThumbnail: { type: String, required: false }, // ✅ Stores video preview thumbnail
      quotedTweet: {
        tweet_id: { type: String, required: false },
        text: { type: String, required: false },
        likes: { type: Number, required: false },
        createdAt: { type: Date, required: false },
        mediaThumbnail: { type: String, required: false },
        video: { type: String, required: false },
        videoThumbnail: { type: String, required: false },
        avatar: { type: String, required: false },
        screenName: { type: String, required: false },
      },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Enforces the natural key used by the upsert in fetchAndStoreTweets and
// speeds up the category-based lookups the newsletter pipeline runs.
tweetSchema.index({ category: 1, screenName: 1 }, { unique: true });

// Retention: each fetch cycle resets `createdAt` on its doc, so an actively
// tracked account never expires. If an account is ever dropped from the
// category list, its stale doc self-cleans 7 days after the last fetch.
tweetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

// Models
export const StoredTweets = dbTweet.model<ITweet>("StoredTweets", tweetSchema);

export interface ICustomProfilePost extends Document {
  screenName: string;
  avatar: string;
  tweets: {
    text: string;
    likes: number;
    tweet_id: string;
    createdAt: Date;
    mediaThumbnail: string;
    video: string;
    videoThumbnail: string; // ✅ Stores video preview thumbnail
    quotedTweet: {
      tweet_id: string;
      text: string;
      likes: number;
      createdAt: Date;
      mediaThumbnail: string;
      video: string;
      videoThumbnail: string;
      avatar: string;
      screenName: string;
    };
  }[];
  createdAt: Date;
}

const CustomProfilePostSchema: Schema = new Schema({
  screenName: { type: String, required: true },
  avatar: { type: String, required: false },
  tweets: [
    {
      text: { type: String, required: true },
      likes: { type: Number, required: true },
      tweet_id: { type: String, required: true },
      createdAt: { type: Date, required: true },
      mediaThumbnail: { type: String, required: false },
      video: { type: String, required: false },
      videoThumbnail: { type: String, required: false }, // ✅ Stores video preview thumbnail
      quotedTweet: {
        tweet_id: { type: String, required: false },
        text: { type: String, required: false },
        likes: { type: Number, required: false },
        createdAt: { type: Date, required: false },
        mediaThumbnail: { type: String, required: false },
        video: { type: String, required: false },
        videoThumbnail: { type: String, required: false },
        avatar: { type: String, required: false },
        screenName: { type: String, required: false },
      },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Enforces the natural key used by the upsert in fetchAndStoreTweetsForProfiles
// and speeds up the profile-based lookups the newsletter pipeline runs.
CustomProfilePostSchema.index({ screenName: 1 }, { unique: true });

// Retention: each fetch cycle resets `createdAt` on its doc, so a profile
// still followed by some user never expires. Once every user unfollows a
// profile, fetching stops and its doc self-cleans 7 days later instead of
// lingering in the collection forever.
CustomProfilePostSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export const CustomProfilePosts = db.model<ICustomProfilePost>(
  "CustomProfilePosts",
  CustomProfilePostSchema
);
