import mongoose from "mongoose";
import "./env";

const MONGO_URL = `${process.env.MONGO_URL}/feedrecap?authSource=admin`;

const db = mongoose.createConnection(MONGO_URL, {});

db.on("connected", () => {
  console.log("Connected to MongoDB");
});

db.on("error", () => {
  console.log("Error connecting to data base");
});

export default db;
