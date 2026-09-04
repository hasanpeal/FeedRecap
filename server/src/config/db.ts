import mongoose from "mongoose";
import "./env";

const MONGO_URL = `${process.env.MONGO_URL}/feedrecap?authSource=admin`;

const db = mongoose.createConnection(MONGO_URL, {});

db.on("connected", () => {
  console.log("[MongoDB] Connected");
});

db.on("error", (error) => {
  console.error("[MongoDB] Connection error:", error);
});

export default db;
