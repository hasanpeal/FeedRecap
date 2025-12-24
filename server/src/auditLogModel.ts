import mongoose, { Schema, Document } from "mongoose";
import db from "./db";

interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  email?: string;
  activityType: string;
  activityDescription: string;
  page?: string;
  metadata?: {
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    email: {
      type: String,
      required: false,
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      index: true,
    },
    activityDescription: {
      type: String,
      required: true,
    },
    page: {
      type: String,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ activityType: 1, createdAt: -1 });
AuditLogSchema.index({ email: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = db.model<IAuditLog>("AuditLog", AuditLogSchema);
export { AuditLog, IAuditLog };
