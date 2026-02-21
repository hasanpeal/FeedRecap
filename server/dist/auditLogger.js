"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityType = void 0;
exports.logActivity = logActivity;
const auditLogModel_1 = require("./auditLogModel");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Log user activity to the audit log
 */
async function logActivity(req, data) {
    try {
        const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress ||
            "unknown";
        const userAgent = req.headers["user-agent"] || "unknown";
        await auditLogModel_1.AuditLog.create({
            userId: data.userId
                ? new mongoose_1.default.Types.ObjectId(data.userId)
                : undefined,
            email: data.email,
            activityType: data.activityType,
            activityDescription: data.activityDescription,
            page: data.page,
            metadata: data.metadata || {},
            ipAddress,
            userAgent,
        });
    }
    catch (error) {
        // Don't throw errors for audit logging failures
        console.error("Error logging activity:", error);
    }
}
/**
 * Activity types enum
 */
var ActivityType;
(function (ActivityType) {
    ActivityType["PAGE_VISIT"] = "PAGE_VISIT";
    ActivityType["ACCOUNT_CREATED"] = "ACCOUNT_CREATED";
    ActivityType["LOGIN"] = "LOGIN";
    ActivityType["LOGOUT"] = "LOGOUT";
    ActivityType["PASSWORD_CHANGED"] = "PASSWORD_CHANGED";
    ActivityType["ACCOUNT_UPDATED"] = "ACCOUNT_UPDATED";
    ActivityType["FEEDBACK_SENT"] = "FEEDBACK_SENT";
    ActivityType["LINK_CLICKED"] = "LINK_CLICKED";
    ActivityType["TWITTER_ACCOUNT_LINKED"] = "TWITTER_ACCOUNT_LINKED";
    ActivityType["TWITTER_ACCOUNT_UNLINKED"] = "TWITTER_ACCOUNT_UNLINKED";
    ActivityType["CATEGORIES_UPDATED"] = "CATEGORIES_UPDATED";
    ActivityType["PROFILES_UPDATED"] = "PROFILES_UPDATED";
    ActivityType["FEED_TYPE_UPDATED"] = "FEED_TYPE_UPDATED";
    ActivityType["NEWSLETTER_VIEWED"] = "NEWSLETTER_VIEWED";
    ActivityType["SETTINGS_UPDATED"] = "SETTINGS_UPDATED";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
