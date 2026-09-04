import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";
import { verifyJWT } from "../services/auth.service";

// JWT Authentication Middleware
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ code: 1, message: "No authorization header" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ code: 1, message: "No token provided" });
  }

  try {
    const decoded = verifyJWT(token);
    req.user = { id: decoded.userId, email: decoded.email };
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

// Admin Authentication Middleware
export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ code: 1, message: "No authorization header" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  if (!token) {
    return res.status(401).json({ code: 1, message: "No token provided" });
  }

  try {
    const decoded = verifyJWT(token);

    // Check if user is admin from database
    const user = await User.findById(decoded.userId).select("isAdmin");
    if (!user || !user.isAdmin) {
      return res
        .status(403)
        .json({ code: 1, message: "Admin access required" });
    }

    req.user = { id: decoded.userId, email: decoded.email };
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
