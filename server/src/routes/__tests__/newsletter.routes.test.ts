import request from "supertest";
import app from "../../app";
import { Newsletter } from "../../models/newsletter.model";
import { signJWT } from "../../services/auth.service";
import { logActivity, ActivityType } from "../../services/auditLog.service";

jest.mock("../../models/newsletter.model", () => ({
  Newsletter: { findById: jest.fn() },
}));

jest.mock("../../services/auditLog.service", () => ({
  ...jest.requireActual("../../services/auditLog.service"),
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const mockedFindById = Newsletter.findById as jest.Mock;
const mockedLogActivity = logActivity as jest.Mock;

describe("GET /newsletter/:id", () => {
  it("returns the newsletter content when no Authorization header is sent", async () => {
    mockedFindById.mockResolvedValue({ content: "Hello world" });

    const res = await request(app).get("/newsletter/abc123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, newsletter: "Hello world" });
    expect(mockedLogActivity).not.toHaveBeenCalled();
    expect(mockedFindById).toHaveBeenCalledWith("abc123");
  });

  it("logs a NEWSLETTER_VIEWED activity when a valid Bearer token is sent", async () => {
    mockedFindById.mockResolvedValue({ content: "Hello world" });
    const token = signJWT({ userId: "user1", email: "user1@example.com" });

    const res = await request(app)
      .get("/newsletter/abc123")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockedLogActivity).toHaveBeenCalledTimes(1);
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user1",
        email: "user1@example.com",
        activityType: ActivityType.NEWSLETTER_VIEWED,
        metadata: { newsletterId: "abc123" },
      })
    );
  });

  it("accepts a raw (non-Bearer-prefixed) Authorization header", async () => {
    mockedFindById.mockResolvedValue({ content: "Hello world" });
    const token = signJWT({ userId: "user2", email: "user2@example.com" });

    const res = await request(app)
      .get("/newsletter/abc123")
      .set("Authorization", token);

    expect(res.status).toBe(200);
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user2" })
    );
  });

  it("silently skips logging when the token is invalid", async () => {
    mockedFindById.mockResolvedValue({ content: "Hello world" });

    const res = await request(app)
      .get("/newsletter/abc123")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, newsletter: "Hello world" });
    expect(mockedLogActivity).not.toHaveBeenCalled();
  });

  it("returns 404 when the newsletter does not exist", async () => {
    mockedFindById.mockResolvedValue(null);

    const res = await request(app).get("/newsletter/missing");

    expect(res.status).toBe(404);
    expect(res.text).toBe("Newsletter not found");
  });

  it("returns 500 when the lookup throws", async () => {
    mockedFindById.mockRejectedValue(new Error("db down"));

    const res = await request(app).get("/newsletter/abc123");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Internal Server Error");
  });
});
