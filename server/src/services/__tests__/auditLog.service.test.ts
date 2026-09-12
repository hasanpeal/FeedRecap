import type { Request } from "express";
import mongoose from "mongoose";

const createMock = jest.fn();

jest.mock("../../models/auditLog.model", () => ({
  AuditLog: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

import { logActivity, ActivityType } from "../auditLog.service";

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    socket: { remoteAddress: "10.0.0.1" },
    ...overrides,
  } as unknown as Request;
}

describe("auditLog.service", () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue(undefined);
  });

  describe("logActivity", () => {
    it("creates an audit log entry with the given activity data", async () => {
      const req = makeRequest({
        headers: { "user-agent": "jest-test-agent" },
      });

      await logActivity(req, {
        email: "user@example.com",
        activityType: ActivityType.LOGIN,
        activityDescription: "User logged in",
        page: "/signin",
      });

      expect(createMock).toHaveBeenCalledTimes(1);
      const arg = createMock.mock.calls[0][0];
      expect(arg.email).toBe("user@example.com");
      expect(arg.activityType).toBe("LOGIN");
      expect(arg.activityDescription).toBe("User logged in");
      expect(arg.page).toBe("/signin");
      expect(arg.userAgent).toBe("jest-test-agent");
      expect(arg.ipAddress).toBe("10.0.0.1");
      expect(arg.userId).toBeUndefined();
      expect(arg.metadata).toEqual({});
    });

    it("converts a provided userId string into an ObjectId", async () => {
      const userId = new mongoose.Types.ObjectId().toHexString();
      const req = makeRequest();

      await logActivity(req, {
        userId,
        activityType: ActivityType.ACCOUNT_UPDATED,
        activityDescription: "Updated profile",
      });

      const arg = createMock.mock.calls[0][0];
      expect(arg.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(arg.userId.toHexString()).toBe(userId);
    });

    it("passes through a provided metadata object", async () => {
      const req = makeRequest();

      await logActivity(req, {
        activityType: ActivityType.CATEGORIES_UPDATED,
        activityDescription: "Categories changed",
        metadata: { added: ["AI"] },
      });

      expect(createMock.mock.calls[0][0].metadata).toEqual({ added: ["AI"] });
    });

    it("prefers x-forwarded-for over socket.remoteAddress, using the first hop", async () => {
      const req = makeRequest({
        headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
      });

      await logActivity(req, {
        activityType: ActivityType.PAGE_VISIT,
        activityDescription: "Visited page",
      });

      expect(createMock.mock.calls[0][0].ipAddress).toBe("203.0.113.5");
    });

    it("falls back to 'unknown' ip/user-agent when nothing is available", async () => {
      const req = makeRequest({ socket: {} as any });

      await logActivity(req, {
        activityType: ActivityType.PAGE_VISIT,
        activityDescription: "Visited page",
      });

      const arg = createMock.mock.calls[0][0];
      expect(arg.ipAddress).toBe("unknown");
      expect(arg.userAgent).toBe("unknown");
    });

    it("swallows errors from AuditLog.create instead of throwing", async () => {
      createMock.mockRejectedValue(new Error("Mongo write failed"));
      const req = makeRequest();

      await expect(
        logActivity(req, {
          activityType: ActivityType.LOGIN,
          activityDescription: "User logged in",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("ActivityType", () => {
    it("exposes the expected activity type constants", () => {
      expect(ActivityType.LOGIN).toBe("LOGIN");
      expect(ActivityType.ACCOUNT_CREATED).toBe("ACCOUNT_CREATED");
      expect(ActivityType.TWITTER_ACCOUNT_LINKED).toBe(
        "TWITTER_ACCOUNT_LINKED"
      );
    });
  });
});
