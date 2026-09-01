import mongoose, { Schema, Document } from "mongoose";
import db from "../config/db";

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

const AUDIT_LOG_RETENTION_DAYS = 90;

// Indexes for better query performance. The createdAt index also doubles as
// retention: logs older than AUDIT_LOG_RETENTION_DAYS are auto-deleted so
// this collection doesn't grow forever. Keep this comfortably longer than
// the longest period the admin dashboard's analytics filters query (30d);
// the dashboard's 1y filter will only ever show up to this many days.
AuditLogSchema.index(
  { createdAt: -1 },
  { expireAfterSeconds: 60 * 60 * 24 * AUDIT_LOG_RETENTION_DAYS }
);
AuditLogSchema.index({ activityType: 1, createdAt: -1 });
AuditLogSchema.index({ email: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = db.model<IAuditLog>("AuditLog", AuditLogSchema);
export { AuditLog, IAuditLog };
