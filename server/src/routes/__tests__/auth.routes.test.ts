import request from "supertest";
import bcrypt from "bcrypt";
import passport from "passport";
import app from "../../app";
import { User } from "../../models/user.model";
import { logActivity } from "../../services/auditLog.service";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
} from "../../services/newsletter.service";
import sgMail, { sendAdminAlert } from "../../services/email.service";
import { verifyJWT } from "../../services/auth.service";

jest.mock("bcrypt", () => ({
  __esModule: true,
  default: { compare: jest.fn(), hash: jest.fn() },
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("../../models/user.model", () => {
  function UserCtor(this: any, data: any) {
    Object.assign(this, data);
    this._id = data._id || "newUserId123";
    this.save = jest.fn().mockResolvedValue(undefined);
  }
  return {
    __esModule: true,
    User: Object.assign(jest.fn(UserCtor), {
      findOne: jest.fn(),
    }),
  };
});

jest.mock("../../services/auditLog.service", () => ({
  __esModule: true,
  logActivity: jest.fn().mockResolvedValue(undefined),
  ActivityType: {
    LOGIN: "LOGIN",
    LOGOUT: "LOGOUT",
    ACCOUNT_CREATED: "ACCOUNT_CREATED",
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
  },
}));

jest.mock("../../services/newsletter.service", () => ({
  __esModule: true,
  fetchTweetsForCategories: jest.fn().mockResolvedValue({
    tweetsByCategory: {},
    top15Tweets: [],
  }),
  generateNewsletter: jest.fn().mockResolvedValue(null),
  sendNewsletterEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/email.service", () => ({
  __esModule: true,
  default: { send: jest.fn().mockResolvedValue(undefined) },
  ADMIN_ALERT_RECIPIENTS: ["pealh0320@gmail.com"],
  sendAdminAlert: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("passport", () => {
  const state: { err: any; user: any; info: any } = {
    err: null,
    user: null,
    info: null,
  };
  return {
    __esModule: true,
    default: {
      initialize: jest.fn(() => (_req: any, _res: any, next: any) => next()),
      use: jest.fn(),
      authenticate: jest.fn((_strategy: string, optionsOrCallback: any) => {
        if (typeof optionsOrCallback === "function") {
          return (_req: any, _res: any, _next: any) =>
            optionsOrCallback(state.err, state.user, state.info);
        }
        return (_req: any, res: any) =>
          res.redirect("https://accounts.google.com/o/oauth2/mock");
      }),
      __setAuthResult: (err: any, user: any, info: any) => {
        state.err = err;
        state.user = user;
        state.info = info;
      },
    },
  };
});

const setAuthResult = (err: any, user: any, info: any) =>
  (passport as any).__setAuthResult(err, user, info);

describe("auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthResult(null, null, null);
  });

  describe("POST /login", () => {
    it("returns 400 when email or password missing", async () => {
      const res = await request(app).post("/login").send({ email: "a@b.com" });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        code: 1,
        message: "Email and password required",
      });
    });

    it("returns 401 when the user doesn't exist", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/login")
        .send({ email: "a@b.com", password: "pw" });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 1, message: "Incorrect email" });
    });

    it("returns 401 when the password doesn't match", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "a@b.com",
        password: "hashed",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const res = await request(app)
        .post("/login")
        .send({ email: "a@b.com", password: "wrong" });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 1, message: "Incorrect password" });
    });

    it("logs in successfully, logs activity, and returns a token", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "a@b.com",
        password: "hashed",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post("/login")
        .send({ email: "a@b.com", password: "correct" });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.token).toEqual(expect.any(String));
      expect(verifyJWT(res.body.token).email).toBe("a@b.com");
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "LOGIN" })
      );
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/login")
        .send({ email: "a@b.com", password: "pw" });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /logout", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).post("/logout");
      expect(res.status).toBe(401);
    });

    it("logs out and logs activity", async () => {
      const token = require("../../services/auth.service").signJWT({
        userId: "u1",
        email: "a@b.com",
      });
      const res = await request(app)
        .post("/logout")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, message: "Logout successful" });
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "LOGOUT" })
      );
    });
  });

  describe("GET /validateEmail", () => {
    it("returns 200 when the email exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: "a@b.com" });
      const res = await request(app).get("/validateEmail?email=a@b.com");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, message: "Email exists" });
    });

    it("returns 404 when the email doesn't exist", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app).get("/validateEmail?email=nope@b.com");
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app).get("/validateEmail?email=a@b.com");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /register", () => {
    it("returns 409 when the user already exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email: "a@b.com" });
      const res = await request(app).post("/register").send({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        password: "pw",
      });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ code: 1, message: "User already exists" });
    });

    it("registers a new user, returns 201 with a token, and fires post-response side effects", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedpw");

      const res = await request(app).post("/register").send({
        firstName: "A",
        lastName: "B",
        email: "new@b.com",
        password: "pw",
      });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.token).toEqual(expect.any(String));
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "ACCOUNT_CREATED" })
      );

      // Post-response side effects (fire-and-forget after res.send in the route).
      await new Promise((resolve) => setImmediate(resolve));
      expect(fetchTweetsForCategories).toHaveBeenCalled();
      expect(sendAdminAlert).toHaveBeenCalled();
    });

    it("sends the welcome newsletter email when generation succeeds", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedpw");
      (generateNewsletter as jest.Mock).mockResolvedValueOnce("Welcome content");

      const res = await request(app).post("/register").send({
        firstName: "A",
        lastName: "B",
        email: "new2@b.com",
        password: "pw",
      });

      expect(res.status).toBe(201);
      await new Promise((resolve) => setImmediate(resolve));
      expect(sendNewsletterEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new2@b.com" }),
        "Welcome content"
      );
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app).post("/register").send({
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        password: "pw",
      });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /resetPassword", () => {
    it("returns 200/code 1 when the user doesn't exist", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/resetPassword")
        .send({ email: "nope@b.com", newPassword: "pw" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 1, message: "User doesn't exist" });
    });

    it("updates the password and logs activity", async () => {
      const userDoc: any = {
        _id: "u1",
        email: "a@b.com",
        password: "old",
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userDoc);
      (bcrypt.hash as jest.Mock).mockResolvedValue("newHashed");

      const res = await request(app)
        .post("/resetPassword")
        .send({ email: "a@b.com", newPassword: "newpw" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 0,
        message: "Password updated successfully",
      });
      expect(userDoc.password).toBe("newHashed");
      expect(userDoc.save).toHaveBeenCalled();
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "PASSWORD_CHANGED" })
      );
    });

    it("returns 200/code 1 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/resetPassword")
        .send({ email: "a@b.com", newPassword: "pw" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });
  });

  describe("POST /sentOTP", () => {
    it("sends an OTP email and returns it", async () => {
      (sgMail.send as jest.Mock).mockResolvedValue(undefined);
      const res = await request(app)
        .post("/sentOTP")
        .send({ email: "a@b.com" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.otp).toMatch(/^\d{6}$/);
    });

    it("returns code 1 when sending fails", async () => {
      (sgMail.send as jest.Mock).mockRejectedValue(new Error("sendgrid down"));
      const res = await request(app)
        .post("/sentOTP")
        .send({ email: "a@b.com" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 1 });
    });
  });

  describe("GET /auth/google/signup and /signin", () => {
    it("redirects to Google for signup", async () => {
      const res = await request(app).get("/auth/google/signup");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("accounts.google.com");
    });

    it("redirects to Google for signin", async () => {
      const res = await request(app).get("/auth/google/signin");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("accounts.google.com");
    });
  });

  describe("GET /auth/google/callback", () => {
    it("passes errors to next() (500 via default error handler)", async () => {
      setAuthResult(new Error("oauth failed"), null, null);
      const res = await request(app).get("/auth/google/callback");
      expect(res.status).toBe(500);
    });

    it("returns code 1 when there is no user", async () => {
      setAuthResult(null, null, { message: "Access denied" });
      const res = await request(app).get("/auth/google/callback");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 1, message: "Access denied" });
    });

    it("redirects with an error when signing up an existing user", async () => {
      setAuthResult(null, { email: "existing@b.com" }, null);
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "existing@b.com",
      });

      const res = await request(app).get(
        "/auth/google/callback?signup=true"
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/signup/");
      expect(res.headers.location).toContain("code=1");
    });

    it("logs in an existing user (signup not requested)", async () => {
      setAuthResult(null, { email: "existing@b.com" }, null);
      (User.findOne as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "existing@b.com",
      });

      const res = await request(app).get("/auth/google/callback");

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/signin/");
      expect(res.headers.location).toContain("code=0");
      expect(res.headers.location).toContain("token=");
    });

    it("signs up a brand-new user", async () => {
      setAuthResult(null, { _id: "u2", email: "new@b.com" }, null);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get(
        "/auth/google/callback?signup=true"
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/signup/");
      expect(res.headers.location).toContain("code=0");
      expect(res.headers.location).toContain("token=");
    });

    it("redirects to signin with an error for a nonexistent user (signup not requested)", async () => {
      setAuthResult(null, { email: "ghost@b.com" }, null);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get("/auth/google/callback");

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/signin/");
      expect(res.headers.location).toContain("code=1");
    });
  });

  describe("GET /check-session", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/check-session");
      expect(res.status).toBe(401);
    });

    it("returns isAuthenticated true with a valid token", async () => {
      const token = require("../../services/auth.service").signJWT({
        userId: "u1",
        email: "a@b.com",
      });
      const res = await request(app)
        .get("/check-session")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isAuthenticated: true, email: "a@b.com" });
    });
  });
});
