import type { Request, Response, NextFunction } from "express";

const CSRF_HEADER = "x-csrf-protection";
const CSRF_HEADER_VALUE = "1";

function configuredOrigins(): Set<string> {
  return new Set(
    [process.env.ORIGIN, process.env.CLIENT_URL]
      .filter(Boolean)
      .map((value) => new URL(value as string).origin)
  );
}

function requestOrigin(req: Request): string | null {
  const origin = req.get("origin");
  if (origin) return origin;

  const referer = req.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Protect cookie-authenticated mutation endpoints from cross-site requests.
 * A custom header forces browser fetches through CORS preflight, while the
 * Origin/Referer check verifies that the request came from our frontend.
 */
export function requireCsrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    return res.status(403).json({ code: 1, message: "CSRF protection required" });
  }

  const origin = requestOrigin(req);
  if (!origin || !configuredOrigins().has(origin)) {
    return res.status(403).json({ code: 1, message: "Invalid request origin" });
  }

  return next();
}

export const csrfHeader = CSRF_HEADER;
export const csrfHeaderValue = CSRF_HEADER_VALUE;
