import request from "supertest";
import app from "../../app";
import { signJWT } from "../../services/auth.service";
import { logActivity, ActivityType } from "../../services/auditLog.service";

jest.mock("../../services/auditLog.service", () => ({
  ...jest.requireActual("../../services/auditLog.service"),
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const mockedLogActivity = logActivity as jest.Mock;
const token = signJWT({ userId: "user1", email: "user1@example.com" });

describe("activity routes auth gating", () => {
  it.each([["/logPageVisit"], ["/logLinkClick"], ["/logFeedback"]])(
    "rejects %s with no Authorization header",
    async (path) => {
      const res = await request(app).post(path).send({});
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 1, message: "No authorization header" });
      expect(mockedLogActivity).not.toHaveBeenCalled();
    }
  );

  it.each([["/logPageVisit"], ["/logLinkClick"], ["/logFeedback"]])(
    "rejects %s with an invalid token",
    async (path) => {
      const res = await request(app)
        .post(path)
        .set("Authorization", "Bearer garbage-token")
        .send({});
      expect(res.status).toBe(401);
      expect(mockedLogActivity).not.toHaveBeenCalled();
    }
  );
});

describe("POST /logPageVisit", () => {
  it("logs a page visit with the given page", async () => {
    const res = await request(app)
      .post("/logPageVisit")
      .set("Authorization", `Bearer ${token}`)
      .send({ page: "/dashboard" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, message: "Page visit logged" });
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user1",
        email: "user1@example.com",
        activityType: ActivityType.PAGE_VISIT,
        activityDescription: "Visited /dashboard",
        page: "/dashboard",
      })
    );
  });

  it("defaults page to 'unknown' when omitted", async () => {
    const res = await request(app)
      .post("/logPageVisit")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ page: "unknown" })
    );
  });

  it("returns 500 when logActivity throws", async () => {
    mockedLogActivity.mockRejectedValueOnce(new Error("boom"));

    const res = await request(app)
      .post("/logPageVisit")
      .set("Authorization", `Bearer ${token}`)
      .send({ page: "/x" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error logging page visit" });
  });
});

describe("POST /logLinkClick", () => {
  it("logs a link click with page and link metadata", async () => {
    const res = await request(app)
      .post("/logLinkClick")
      .set("Authorization", `Bearer ${token}`)
      .send({ link: "https://example.com", page: "/dashboard" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, message: "Link click logged" });
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        activityType: ActivityType.LINK_CLICKED,
        activityDescription: "Clicked link: https://example.com",
        page: "/dashboard",
        metadata: { link: "https://example.com" },
      })
    );
  });

  it("defaults page to 'unknown' when omitted", async () => {
    const res = await request(app)
      .post("/logLinkClick")
      .set("Authorization", `Bearer ${token}`)
      .send({ link: "https://example.com" });

    expect(res.status).toBe(200);
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ page: "unknown" })
    );
  });

  it("returns 500 when logActivity throws", async () => {
    mockedLogActivity.mockRejectedValueOnce(new Error("boom"));

    const res = await request(app)
      .post("/logLinkClick")
      .set("Authorization", `Bearer ${token}`)
      .send({ link: "https://example.com" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error logging link click" });
  });
});

describe("POST /logFeedback", () => {
  it("logs feedback with a subject", async () => {
    const res = await request(app)
      .post("/logFeedback")
      .set("Authorization", `Bearer ${token}`)
      .send({ feedback: "Great app!", subject: "Praise" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, message: "Feedback logged" });
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        activityType: ActivityType.FEEDBACK_SENT,
        activityDescription: "Feedback sent: Praise",
        metadata: { feedback: "Great app!", subject: "Praise" },
      })
    );
  });

  it("defaults the description subject to 'No subject' when omitted", async () => {
    const res = await request(app)
      .post("/logFeedback")
      .set("Authorization", `Bearer ${token}`)
      .send({ feedback: "Great app!" });

    expect(res.status).toBe(200);
    expect(mockedLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        activityDescription: "Feedback sent: No subject",
      })
    );
  });

  it("returns 500 when logActivity throws", async () => {
    mockedLogActivity.mockRejectedValueOnce(new Error("boom"));

    const res = await request(app)
      .post("/logFeedback")
      .set("Authorization", `Bearer ${token}`)
      .send({ feedback: "x" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error logging feedback" });
  });
});
