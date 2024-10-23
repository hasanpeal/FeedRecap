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
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  isNewUser: { type: Boolean, default: true },
  time: { type: [String], default: [] },
  newsletter: {
    type: String,
    default:
      "Thank you for signing up. Please wait for your first newsletter to generate",
  },
  categories: { type: [String], default: [] },
  timezone: { type: String, required: false },
  totalnewsletter: { type: Number, default: 0 }, 
});

const User = db.model<IUser>("User", UserSchema);
export { User, IUser};
