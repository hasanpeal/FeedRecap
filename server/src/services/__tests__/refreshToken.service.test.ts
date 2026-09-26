const mockRedisState = new Map<string, string>();

jest.mock("../../config/redis", () => ({
  __esModule: true,
  default: {
    set: jest.fn(async (key: string, value: string) => {
      mockRedisState.set(key, value);
      return "OK";
    }),
    get: jest.fn(async (key: string) => mockRedisState.get(key) ?? null),
    del: jest.fn(async (key: string) => (mockRedisState.delete(key) ? 1 : 0)),
  },
}));

import {
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from "../refreshToken.service";

describe("refreshToken.service", () => {
  beforeEach(() => mockRedisState.clear());

  it("creates an opaque token and stores only its hashed lookup key", async () => {
    const token = await createRefreshToken({ userId: "u1", email: "a@b.com" });
    expect(token).toEqual(expect.any(String));
    expect(token.length).toBeGreaterThan(40);
    expect([...mockRedisState.keys()][0]).not.toContain(token);
  });

  it("rotates a token and makes the old token single-use", async () => {
    const token = await createRefreshToken({ userId: "u1", email: "a@b.com" });
    const rotated = await rotateRefreshToken(token);
    expect(rotated?.session).toEqual({ userId: "u1", email: "a@b.com" });
    expect(rotated?.token).not.toBe(token);
    expect(await rotateRefreshToken(token)).toBeNull();
  });

  it("revokes a refresh token", async () => {
    const token = await createRefreshToken({ userId: "u1", email: "a@b.com" });
    await revokeRefreshToken(token);
    expect(await rotateRefreshToken(token)).toBeNull();
  });
});
