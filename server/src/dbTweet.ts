import mongoose from "mongoose";
import env from "dotenv";

env.config();

const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD_TWEET;

const MONGO_URL_TWEET = `mongodb+srv://${username}:${password}@tweets.90fmj.mongodb.net/?retryWrites=true&w=majority&appName=tweets`;

const dbTweet = mongoose.createConnection(MONGO_URL_TWEET, {});

dbTweet.on("connected", () => {
  console.log("Connected to MongoDB Atlas for Tweets");
});

dbTweet.on("error", () => {
  console.log("Error connecting to data base for Tweets");
});

export default dbTweet;