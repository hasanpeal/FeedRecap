import crypto from "crypto";
import redis from "../config/redis";

const REFRESH_TOKEN_TTL_SECONDS = Number(
  process.env.REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 30
);
const KEY_PREFIX = "auth:refresh:";

interface RefreshSession {
  userId: string;
  email: string;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function keyFor(token: string): string {
  return `${KEY_PREFIX}${hashToken(token)}`;
}

export async function createRefreshToken(session: RefreshSession): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  await redis.set(keyFor(token), JSON.stringify(session), "EX", REFRESH_TOKEN_TTL_SECONDS);
  return token;
}

export async function rotateRefreshToken(
  token: string
): Promise<{ token: string; session: RefreshSession } | null> {
  if (!token) return null;

  const key = keyFor(token);
  const raw = await redis.get(key);
  if (!raw) return null;

  // Consume before issuing the replacement so the presented token is
  // single-use. A replay therefore cannot mint another access token.
  await redis.del(key);

  const session = JSON.parse(raw) as RefreshSession;
  const nextToken = await createRefreshToken(session);
  return { token: nextToken, session };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  if (token) await redis.del(keyFor(token));
}

export const refreshTokenTtlSeconds = REFRESH_TOKEN_TTL_SECONDS;
