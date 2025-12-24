import { Request } from "express";
import { AuditLog } from "./auditLogModel";
import mongoose from "mongoose";

export interface AuditLogData {
  userId?: string;
  email?: string;
  activityType: string;
  activityDescription: string;
  page?: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Log user activity to the audit log
 */
export async function logActivity(
  req: Request,
  data: AuditLogData
): Promise<void> {
  try {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    await AuditLog.create({
      userId: data.userId
        ? new mongoose.Types.ObjectId(data.userId)
        : undefined,
      email: data.email,
      activityType: data.activityType,
      activityDescription: data.activityDescription,
      page: data.page,
      metadata: data.metadata || {},
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Don't throw errors for audit logging failures
    console.error("Error logging activity:", error);
  }
}

/**
 * Activity types enum
 */
export enum ActivityType {
  PAGE_VISIT = "PAGE_VISIT",
  ACCOUNT_CREATED = "ACCOUNT_CREATED",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  ACCOUNT_UPDATED = "ACCOUNT_UPDATED",
  FEEDBACK_SENT = "FEEDBACK_SENT",
  LINK_CLICKED = "LINK_CLICKED",
  TWITTER_ACCOUNT_LINKED = "TWITTER_ACCOUNT_LINKED",
  TWITTER_ACCOUNT_UNLINKED = "TWITTER_ACCOUNT_UNLINKED",
  CATEGORIES_UPDATED = "CATEGORIES_UPDATED",
  PROFILES_UPDATED = "PROFILES_UPDATED",
  FEED_TYPE_UPDATED = "FEED_TYPE_UPDATED",
  NEWSLETTER_VIEWED = "NEWSLETTER_VIEWED",
  SETTINGS_UPDATED = "SETTINGS_UPDATED",
}
