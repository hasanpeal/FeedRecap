"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const db_1 = __importDefault(require("./db"));
const AuditLogSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.Mixed,
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
}, {
    timestamps: true,
});
// Indexes for better query performance
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ activityType: 1, createdAt: -1 });
AuditLogSchema.index({ email: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
const AuditLog = db_1.default.model("AuditLog", AuditLogSchema);
exports.AuditLog = AuditLog;
