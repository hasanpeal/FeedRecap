import type { Request, Response, NextFunction } from "express";
import { requireCsrfProtection } from "../csrf.middleware";

function mockRequest(headers: Record<string, string>): Request {
  return {
    get: (name: string) => headers[name.toLowerCase()],
  } as Request;
}

function mockResponse() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res as Response;
}

describe("requireCsrfProtection", () => {
  const originalOrigin = process.env.ORIGIN;
  const originalClientUrl = process.env.CLIENT_URL;

  beforeEach(() => {
    process.env.ORIGIN = "https://feedrecap.example";
    process.env.CLIENT_URL = "https://feedrecap.example";
  });

  afterAll(() => {
    process.env.ORIGIN = originalOrigin;
    process.env.CLIENT_URL = originalClientUrl;
  });

  it("accepts the configured Origin with the CSRF header", () => {
    const req = mockRequest({
      origin: "https://feedrecap.example",
      "x-csrf-protection": "1",
    });
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    requireCsrfProtection(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("accepts a trusted Referer when Origin is unavailable", () => {
    const req = mockRequest({
      referer: "https://feedrecap.example/settings",
      "x-csrf-protection": "1",
    });
    const res = mockResponse();
    const next = jest.fn() as NextFunction;

    requireCsrfProtection(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects requests without the custom CSRF header", () => {
    const res = mockResponse();
    const next = jest.fn() as NextFunction;
    requireCsrfProtection(
      mockRequest({ origin: "https://feedrecap.example" }),
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an untrusted Origin", () => {
    const res = mockResponse();
    const next = jest.fn() as NextFunction;
    requireCsrfProtection(
      mockRequest({ origin: "https://evil.example", "x-csrf-protection": "1" }),
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests with neither Origin nor Referer", () => {
    const res = mockResponse();
    requireCsrfProtection(
      mockRequest({ "x-csrf-protection": "1" }),
      res,
      jest.fn()
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
