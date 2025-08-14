"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Connect to MongoDB
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASSWORD;
const MONGO_URL = `mongodb+srv://${username}:${password}@user.44ggn.mongodb.net/?retryWrites=true&w=majority&appName=user`;
const db = mongoose_1.default.createConnection(MONGO_URL, {});
db.on("connected", () => {
    console.log("Connected to MongoDB User Atlas");
});
db.on("error", () => {
    console.log("Error connecting to data base");
});
exports.default = db;
