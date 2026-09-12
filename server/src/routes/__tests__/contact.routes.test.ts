import request from "supertest";
import app from "../../app";
import sgMail from "../../services/email.service";
import { logActivity } from "../../services/auditLog.service";
import { signJWT } from "../../services/auth.service";

jest.mock("../../services/email.service", () => ({
  __esModule: true,
  default: { send: jest.fn() },
  ADMIN_ALERT_RECIPIENTS: [],
  sendAdminAlert: jest.fn(),
}));

jest.mock("../../services/auditLog.service", () => ({
  __esModule: true,
  logActivity: jest.fn().mockResolvedValue(undefined),
  ActivityType: {
    FEEDBACK_SENT: "FEEDBACK_SENT",
  },
}));

const token = signJWT({ userId: "user123", email: "user@example.com" });

describe("POST /contact", () => {
  const ORIGINAL_ENV = process.env.FROM_EMAIL;

  beforeEach(() => {
    process.env.FROM_EMAIL = "from@example.com";
    (sgMail.send as jest.Mock).mockReset().mockResolvedValue(undefined);
    (logActivity as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env.FROM_EMAIL = ORIGINAL_ENV;
  });

  it("returns 401 with no Authorization header", async () => {
    const res = await request(app).post("/contact").send({ message: "hi" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when message is missing", async () => {
    const res = await request(app)
      .post("/contact")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 1, message: "Message is required" });
  });

  it("returns 400 when message is blank/whitespace", async () => {
    const res = await request(app)
      .post("/contact")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is not a string", async () => {
    const res = await request(app)
      .post("/contact")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: 12345 });
    expect(res.status).toBe(400);
  });

  it("returns 500 when FROM_EMAIL is not configured", async () => {
    delete process.env.FROM_EMAIL;
    const res = await request(app)
      .post("/contact")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hello there" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: 1,
      message: "Server email not configured",
    });
  });

  it("sends the email, logs activity, and returns 200 on success", async () => {
    const res = await request(app)
      .post("/contact")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hello there" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, message: "Message sent" });
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "pealh0320@gmail.com",
        from: "from@example.com",
        subject: expect.stringContaining("user@example.com"),
      })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user123",
        email: "user@example.com",
        activityType: "FEEDBACK_SENT",
      })
    );
  });

  it("returns 500 when sending the email fails", async () => {
    (sgMail.send as jest.Mock).mockRejectedValue(new Error("sendgrid down"));
    const res = await request(app)
      .post("/contact")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hello there" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error sending email" });
  });
});
