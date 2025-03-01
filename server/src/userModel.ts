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
  wise: "categorywise" | "customProfiles"; // New field for feed type
  profiles: string[]; // New field for custom profiles
  posts: mongoose.Types.ObjectId[]; // References to CustomProfilePosts
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
  }, // New field
  profiles: { type: [String], default: [] }, // New field
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "CustomProfilePosts" }], // Reference to custom profile posts
});

const User = db.model<IUser>("User", UserSchema);
export { User, IUser};
