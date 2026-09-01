import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/userModel";

// JWT Configuration
const JWT_SECRET: string =
  process.env.JWT_SECRET || crypto.randomBytes(64).toString("hex");
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d"; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signJWT(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "feedrecap",
  } as jwt.SignOptions);
}

export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: "feedrecap",
  }) as JWTPayload;
}

function extractBearerToken(authHeader: string): string {
  return authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
}

export function authenticateJWT(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ code: 1, message: "No authorization header" });
  }

  const token = extractBearerToken(authHeader);

  if (!token) {
    return res.status(401).json({ code: 1, message: "No token provided" });
  }

  try {
    const decoded = verifyJWT(token);
    (req as any).user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ code: 1, message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ code: 1, message: "Invalid token" });
    }
    return res.status(401).json({ code: 1, message: "Authentication failed" });
  }
}

export async function authenticateAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ code: 1, message: "No authorization header" });
  }

  const token = extractBearerToken(authHeader);

  if (!token) {
    return res.status(401).json({ code: 1, message: "No token provided" });
  }

  try {
    const decoded = verifyJWT(token);

    const user = await User.findById(decoded.userId).select("isAdmin");
    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .json({ code: 1, message: "Admin access required" });
    }

    (req as any).user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ code: 1, message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ code: 1, message: "Invalid token" });
    }
    return res.status(401).json({ code: 1, message: "Authentication failed" });
  }
}
