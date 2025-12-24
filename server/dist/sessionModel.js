"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSchema = exports.Session = void 0;
const mongoose_1 = require("mongoose");
const db_1 = __importDefault(require("./db"));
// Define the Session schema
const SessionSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, unique: true },
    data: { type: mongoose_1.Schema.Types.Mixed, required: true },
    expires: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});
exports.SessionSchema = SessionSchema;
// Create the Session model
const Session = db_1.default.model("Session", SessionSchema);
exports.Session = Session;
