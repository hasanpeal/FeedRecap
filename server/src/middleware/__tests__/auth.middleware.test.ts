import type { Request, Response, NextFunction } from "express";

const verifyJWTMock = jest.fn();
const findByIdMock = jest.fn();

jest.mock("../../services/auth.service", () => ({
  verifyJWT: (...args: unknown[]) => verifyJWTMock(...args),
}));

jest.mock("../../models/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => findByIdMock(...args),
  },
}));

import { authenticateJWT, authenticateAdmin } from "../auth.middleware";

function makeRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

describe("authenticateJWT", () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    verifyJWTMock.mockReset();
    res = makeRes();
    next = jest.fn();
  });

  it("responds 401 when no authorization header is present", () => {
    const req = makeReq();

    authenticateJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 1,
      message: "No authorization header",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 401 when the Bearer header has no token", () => {
    const req = makeReq("Bearer ");

    authenticateJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 1,
      message: "No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a raw token without the Bearer prefix", () => {
    verifyJWTMock.mockReturnValue({ userId: "u1", email: "a@example.com" });
    const req = makeReq("raw-token");

    authenticateJWT(req, res, next);

    expect(verifyJWTMock).toHaveBeenCalledWith("raw-token");
    expect(req.user).toEqual({ id: "u1", email: "a@example.com" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("strips the Bearer prefix, verifies the token, and calls next()", () => {
    verifyJWTMock.mockReturnValue({ userId: "u2", email: "b@example.com" });
    const req = makeReq("Bearer good-token");

    authenticateJWT(req, res, next);

    expect(verifyJWTMock).toHaveBeenCalledWith("good-token");
    expect(req.user).toEqual({ id: "u2", email: "b@example.com" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 401 'Token expired' when verifyJWT throws TokenExpiredError", () => {
    const err = new Error("expired");
    err.name = "TokenExpiredError";
    verifyJWTMock.mockImplementation(() => {
      throw err;
    });
    const req = makeReq("Bearer expired-token");

    authenticateJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 1, message: "Token expired" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 401 'Invalid token' when verifyJWT throws JsonWebTokenError", () => {
    const err = new Error("bad");
    err.name = "JsonWebTokenError";
    verifyJWTMock.mockImplementation(() => {
      throw err;
    });
    const req = makeReq("Bearer bad-token");

    authenticateJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 1, message: "Invalid token" });
  });

  it("responds 401 'Authentication failed' for any other verification error", () => {
    verifyJWTMock.mockImplementation(() => {
      throw new Error("something else");
    });
    const req = makeReq("Bearer weird-token");

    authenticateJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 1,
      message: "Authentication failed",
    });
  });
});

describe("authenticateAdmin", () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    verifyJWTMock.mockReset();
    findByIdMock.mockReset();
    res = makeRes();
    next = jest.fn();
  });

  it("responds 401 when no authorization header is present", async () => {
    const req = makeReq();

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 401 when the Bearer header has no token", async () => {
    const req = makeReq("Bearer ");

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 1,
      message: "No token provided",
    });
  });

  it("responds 403 when the user is not found", async () => {
    verifyJWTMock.mockReturnValue({ userId: "u1", email: "a@example.com" });
    const select = jest.fn().mockResolvedValue(null);
    findByIdMock.mockReturnValue({ select });
    const req = makeReq("Bearer good-token");

    await authenticateAdmin(req, res, next);

    expect(findByIdMock).toHaveBeenCalledWith("u1");
    expect(select).toHaveBeenCalledWith("isAdmin");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 1,
      message: "Admin access required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 403 when the user is found but is not an admin", async () => {
    verifyJWTMock.mockReturnValue({ userId: "u1", email: "a@example.com" });
    const select = jest.fn().mockResolvedValue({ isAdmin: false });
    findByIdMock.mockReturnValue({ select });
    const req = makeReq("Bearer good-token");

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a raw token without the Bearer prefix", async () => {
    verifyJWTMock.mockReturnValue({ userId: "u1", email: "a@example.com" });
    const select = jest.fn().mockResolvedValue({ isAdmin: true });
    findByIdMock.mockReturnValue({ select });
    const req = makeReq("raw-token");

    await authenticateAdmin(req, res, next);

    expect(verifyJWTMock).toHaveBeenCalledWith("raw-token");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next() when the user is found and is an admin", async () => {
    verifyJWTMock.mockReturnValue({ userId: "u1", email: "a@example.com" });
    const select = jest.fn().mockResolvedValue({ isAdmin: true });
    findByIdMock.mockReturnValue({ select });
    const req = makeReq("Bearer good-token");

    await authenticateAdmin(req, res, next);

    expect(req.user).toEqual({ id: "u1", email: "a@example.com" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 401 'Token expired' when verifyJWT throws TokenExpiredError", async () => {
    const err = new Error("expired");
    err.name = "TokenExpiredError";
    verifyJWTMock.mockImplementation(() => {
      throw err;
    });
    const req = makeReq("Bearer expired-token");

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 1, message: "Token expired" });
  });

  it("responds 401 'Invalid token' when verifyJWT throws JsonWebTokenError", async () => {
    const err = new Error("bad");
    err.name = "JsonWebTokenError";
    verifyJWTMock.mockImplementation(() => {
      throw err;
    });
    const req = makeReq("Bearer bad-token");

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ code: 1, message: "Invalid token" });
  });

  it("responds 401 'Authentication failed' for any other error, including a DB failure", async () => {
    verifyJWTMock.mockReturnValue({ userId: "u1", email: "a@example.com" });
    const select = jest.fn().mockRejectedValue(new Error("DB down"));
    findByIdMock.mockReturnValue({ select });
    const req = makeReq("Bearer good-token");

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 1,
      message: "Authentication failed",
    });
  });
});
