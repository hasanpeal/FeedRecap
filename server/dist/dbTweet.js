"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD_TWEET;
const MONGO_URL_TWEET = `mongodb+srv://${username}:${password}@tweets.90fmj.mongodb.net/?retryWrites=true&w=majority&appName=tweets`;
const dbTweet = mongoose_1.default.createConnection(MONGO_URL_TWEET, {});
dbTweet.on("connected", () => {
    console.log("Connected to MongoDB Atlas for Tweets");
});
dbTweet.on("error", () => {
    console.log("Error connecting to data base for Tweets");
});
exports.default = dbTweet;
