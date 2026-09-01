import mongoose from "mongoose";
import env from "dotenv";

env.config();
// Connect to MongoDB
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD;

const MONGO_URL = `mongodb+srv://${username}:${password}@user.44ggn.mongodb.net/?retryWrites=true&w=majority&appName=user`;

const db = mongoose.createConnection(MONGO_URL, {});

db.on("connected", () => {
  console.log("Connected to MongoDB User Atlas");
});

db.on("error", () => {
  console.log("Error connecting to data base");
});

export default db;