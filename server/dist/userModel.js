"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const db_1 = __importDefault(require("./db"));
const UserSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    isNewUser: { type: Boolean, default: false },
    time: { type: [String], default: ["Morning", "Afternoon", "Night"] },
    newsletter: {
        type: String,
        default: "Thank you for signing up. Please wait for your first newsletter to generate",
    },
    categories: {
        type: [String],
        default: [
            "Politics",
            "Geopolitics",
            "Finance",
            "AI",
            "Tech",
            "Crypto",
            "Meme",
            "Sports",
            "Entertainment",
        ],
    },
    timezone: { type: String, required: false },
    totalnewsletter: { type: Number, default: 0 },
    wise: {
        type: String,
        enum: ["categorywise", "customProfiles"],
        default: "categorywise",
    },
    profiles: { type: [String], default: [] },
    twitterUsername: { type: String, default: null },
});
const User = db_1.default.model("User", UserSchema);
exports.User = User;
