import crypto from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_OTP_REQUESTS = 3;

interface OtpRecord {
  otpHash: string;
  expiresAt: number;
  attempts: number;
}

interface ResetRecord {
  email: string;
  expiresAt: number;
}

const otpRecords = new Map<string, OtpRecord>();
const resetTokens = new Map<string, ResetRecord>();
const requestHistory = new Map<string, number[]>();

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export function canRequestOtp(email: string): boolean {
  const key = normalizeEmail(email);
  const now = Date.now();
  const recent = (requestHistory.get(key) || []).filter(
    (timestamp) => now - timestamp < OTP_REQUEST_WINDOW_MS
  );
  if (recent.length >= MAX_OTP_REQUESTS) {
    requestHistory.set(key, recent);
    return false;
  }
  recent.push(now);
  requestHistory.set(key, recent);
  return true;
}

export function createOtp(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const otp = crypto.randomInt(100000, 1000000).toString();
  otpRecords.set(normalizedEmail, {
    otpHash: hash(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return otp;
}

export function verifyOtp(
  email: string,
  otp: string
): { ok: true; resetToken: string } | { ok: false } {
  const normalizedEmail = normalizeEmail(email);
  const record = otpRecords.get(normalizedEmail);
  if (!record || record.expiresAt < Date.now()) {
    otpRecords.delete(normalizedEmail);
    return { ok: false };
  }

  record.attempts += 1;
  if (record.attempts > MAX_VERIFY_ATTEMPTS) {
    otpRecords.delete(normalizedEmail);
    return { ok: false };
  }

  const candidate = Buffer.from(hash(otp));
  const expected = Buffer.from(record.otpHash);
  if (
    candidate.length !== expected.length ||
    !crypto.timingSafeEqual(candidate, expected)
  ) {
    return { ok: false };
  }

  otpRecords.delete(normalizedEmail);
  const resetToken = crypto.randomBytes(32).toString("hex");
  resetTokens.set(hash(resetToken), {
    email: normalizedEmail,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });
  return { ok: true, resetToken };
}

export function consumeResetToken(email: string, token: string): boolean {
  if (!token) return false;
  const tokenHash = hash(token);
  const record = resetTokens.get(tokenHash);
  if (
    !record ||
    record.expiresAt < Date.now() ||
    record.email !== normalizeEmail(email)
  ) {
    if (record?.expiresAt && record.expiresAt < Date.now()) {
      resetTokens.delete(tokenHash);
    }
    return false;
  }
  resetTokens.delete(tokenHash);
  return true;
}

export function clearPasswordResetStateForTests() {
  otpRecords.clear();
  resetTokens.clear();
  requestHistory.clear();
}
