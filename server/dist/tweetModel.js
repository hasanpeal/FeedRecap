"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomProfilePosts = exports.StoredTweets = exports.tweetSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const db_1 = __importDefault(require("./db"));
const dbTweet_1 = __importDefault(require("./dbTweet"));
// Tweet Schema for category posts
exports.tweetSchema = new mongoose_1.default.Schema({
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
exports.StoredTweets = dbTweet_1.default.model("StoredTweets", exports.tweetSchema);
const CustomProfilePostSchema = new mongoose_1.Schema({
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
exports.CustomProfilePosts = db_1.default.model("CustomProfilePosts", CustomProfilePostSchema);
