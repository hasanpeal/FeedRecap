// Test-only stand-in for config/db.ts. Real config/db.ts opens a live
// connection to production MongoDB on import — never let a test touch that.
// mongoose.createConnection() with no URI creates a Connection object that
// never dials out, but still supports .model() so every model file can
// register its schema exactly as it does in production.
import mongoose from "mongoose";

const db = mongoose.createConnection();

export default db;
