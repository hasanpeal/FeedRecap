import crypto from "crypto";
import { PasswordReset } from "../models/passwordReset.model";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_OTP_REQUESTS = 3;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export async function canRequestOtp(email: string): Promise<boolean> {
  const key = normalizeEmail(email);
  const now = new Date();
  const windowStart = new Date(now.getTime() - OTP_REQUEST_WINDOW_MS);
  const existing = await PasswordReset.findOne({ email: key }).lean();
  const recent = (existing?.requestTimestamps || []).filter(
    (timestamp: Date) => new Date(timestamp) >= windowStart
  );
  if (recent.length >= MAX_OTP_REQUESTS) return false;

  recent.push(now);
  await PasswordReset.findOneAndUpdate(
    { email: key },
    {
      $set: {
        requestTimestamps: recent,
        expiresAt: new Date(now.getTime() + OTP_REQUEST_WINDOW_MS),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return true;
}

export async function createOtp(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const otp = crypto.randomInt(100000, 1000000).toString();
  const now = Date.now();
  await PasswordReset.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        otpHash: hash(otp),
        otpExpiresAt: new Date(now + OTP_TTL_MS),
        otpAttempts: 0,
        expiresAt: new Date(now + Math.max(OTP_TTL_MS, OTP_REQUEST_WINDOW_MS)),
      },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return otp;
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ ok: true; resetToken: string } | { ok: false }> {
  const normalizedEmail = normalizeEmail(email);
  const record = await PasswordReset.findOneAndUpdate(
    {
      email: normalizedEmail,
      otpExpiresAt: { $gt: new Date() },
      otpAttempts: { $lt: MAX_VERIFY_ATTEMPTS },
    },
    { $inc: { otpAttempts: 1 } },
    { new: true }
  ).lean();

  if (!record?.otpHash) return { ok: false };

  const candidate = Buffer.from(hash(otp), "hex");
  const expected = Buffer.from(record.otpHash, "hex");
  if (
    candidate.length !== expected.length ||
    !crypto.timingSafeEqual(
      Uint8Array.from(candidate),
      Uint8Array.from(expected)
    )
  ) {
    return { ok: false };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  // Replace the OTP with a reset-token hash. No raw credential is persisted.
  const updated = await PasswordReset.findOneAndUpdate(
    { _id: record._id, otpHash: record.otpHash },
    {
      $set: {
        resetTokenHash: hash(resetToken),
        resetTokenExpiresAt: new Date(now + RESET_TOKEN_TTL_MS),
        expiresAt: new Date(now + RESET_TOKEN_TTL_MS),
      },
      $unset: { otpHash: 1, otpExpiresAt: 1 },
    },
    { new: true }
  );
  return updated ? { ok: true, resetToken } : { ok: false };
}

export async function consumeResetToken(
  email: string,
  token: string
): Promise<boolean> {
  if (!token) return false;
  // findOneAndDelete makes successful consumption atomic across replicas:
  // exactly one request can use a reset token.
  const consumed = await PasswordReset.findOneAndDelete({
    email: normalizeEmail(email),
    resetTokenHash: hash(token),
    resetTokenExpiresAt: { $gt: new Date() },
  });
  return Boolean(consumed);
}
