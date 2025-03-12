import mongoose, { Schema, Document } from "mongoose";
import db from "./db";
interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isNewUser: boolean;
  time: string[];
  newsletter: string;
  categories: string[];
  timezone: string;
  totalnewsletter: number;
  wise: "categorywise" | "customProfiles";
  profiles: string[];
  twitterUsername: string,
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  isNewUser: { type: Boolean, default: false },
  time: { type: [String], default: ["Morning", "Afternoon", "Night"] },
  newsletter: {
    type: String,
    default:
      "Thank you for signing up. Please wait for your first newsletter to generate",
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

const User = db.model<IUser>("User", UserSchema);
export { User, IUser};
