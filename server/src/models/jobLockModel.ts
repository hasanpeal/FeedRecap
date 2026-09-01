import mongoose, { Schema, Document } from "mongoose";
import db from "../config/db";

/**
 * Distributed lock used to make sure only ONE server replica executes a
 * given scheduled job run (newsletter send, tweet fetch cycle, weekly
 * digest, etc). Without this, every replica runs its own in-process
 * scheduler/cron and the same job fires once per replica.
 */
export interface IJobLock extends Document {
  jobKey: string;
  lockedBy: string;
  lockedAt: Date;
  status: "running" | "completed" | "failed";
  completedAt?: Date;
}

const JobLockSchema: Schema = new Schema(
  {
    jobKey: { type: String, required: true, unique: true },
    lockedBy: { type: String, required: true },
    lockedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Locks are keyed by time period (e.g. "newsletter:Morning:2026-08-31"), so
// they naturally go stale once that period has passed. Auto-expire after 3
// days purely for housekeeping.
JobLockSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 3 });

const JobLock = db.model<IJobLock>("JobLock", JobLockSchema);
export { JobLock };
