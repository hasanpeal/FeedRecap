import mongoose, { Document, Schema } from "mongoose";
import db from "./db";
import dbTweet from "./dbTweet";

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

export const CustomProfilePosts = db.model<ICustomProfilePost>(
  "CustomProfilePosts",
  CustomProfilePostSchema
);
