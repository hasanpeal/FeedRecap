import { Schema, Document } from "mongoose";
import db from "../config/db";

export interface IPasswordReset extends Document {
  email: string;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  requestTimestamps: Date[];
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  expiresAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  email: { type: String, required: true, unique: true, index: true },
  otpHash: { type: String, required: false },
  otpExpiresAt: { type: Date, required: false },
  otpAttempts: { type: Number, default: 0 },
  requestTimestamps: { type: [Date], default: [] },
  resetTokenHash: { type: String, required: false },
  resetTokenExpiresAt: { type: Date, required: false },
  // MongoDB removes abandoned reset records automatically after this time.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const PasswordReset = db.model<IPasswordReset>(
  "PasswordReset",
  PasswordResetSchema
);
