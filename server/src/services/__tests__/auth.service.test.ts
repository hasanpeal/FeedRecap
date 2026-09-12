import jwt from "jsonwebtoken";
import { signJWT, verifyJWT } from "../auth.service";

describe("auth.service", () => {
  describe("signJWT", () => {
    it("returns a signed JWT string containing the payload", () => {
      const token = signJWT({ userId: "user-1", email: "a@example.com" });

      expect(typeof token).toBe("string");
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      expect(decoded.userId).toBe("user-1");
      expect(decoded.email).toBe("a@example.com");
      expect(decoded.iss).toBe("feedrecap");
      expect(decoded.exp).toBeDefined();
    });
  });

  describe("verifyJWT", () => {
    it("verifies and decodes a token created by signJWT", () => {
      const token = signJWT({ userId: "user-2", email: "b@example.com" });

      const payload = verifyJWT(token);
      expect(payload.userId).toBe("user-2");
      expect(payload.email).toBe("b@example.com");
    });

    it("throws JsonWebTokenError for a malformed token", () => {
      expect(() => verifyJWT("not-a-real-token")).toThrow(
        jwt.JsonWebTokenError
      );
    });

    it("throws JsonWebTokenError for a token signed with the wrong secret", () => {
      const bogus = jwt.sign(
        { userId: "user-3", email: "c@example.com" },
        "wrong-secret",
        { issuer: "feedrecap" }
      );

      expect(() => verifyJWT(bogus)).toThrow(jwt.JsonWebTokenError);
    });

    it("throws JsonWebTokenError when the issuer does not match", () => {
      const wrongIssuer = jwt.sign(
        { userId: "user-4", email: "d@example.com" },
        process.env.JWT_SECRET as string,
        { issuer: "someone-else" }
      );

      expect(() => verifyJWT(wrongIssuer)).toThrow(jwt.JsonWebTokenError);
    });

    it("throws TokenExpiredError for an expired token", () => {
      const expired = jwt.sign(
        { userId: "user-5", email: "e@example.com" },
        process.env.JWT_SECRET as string,
        { issuer: "feedrecap", expiresIn: -10 }
      );

      expect(() => verifyJWT(expired)).toThrow(jwt.TokenExpiredError);
    });
  });
});
