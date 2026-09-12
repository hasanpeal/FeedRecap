import request from "supertest";
import app from "../../app";
import { User } from "../../models/user.model";
import { AuditLog } from "../../models/auditLog.model";
import { signJWT } from "../../services/auth.service";

jest.mock("../../models/user.model", () => ({
  User: { findById: jest.fn(), find: jest.fn() },
}));

jest.mock("../../models/auditLog.model", () => ({
  AuditLog: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const mockedUserFindById = User.findById as jest.Mock;
const mockedUserFind = User.find as jest.Mock;
const mockedAuditFind = AuditLog.find as jest.Mock;
const mockedAuditCount = AuditLog.countDocuments as jest.Mock;

// Chainable query mock: every intermediate method returns the same object,
// `.lean()` (or `.select()` where that's the terminal call, per real usage
// in admin.routes.ts) resolves with the given data.
function makeQueryChain(data: any) {
  const chain: any = {};
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.skip = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockResolvedValue(data);
  return chain;
}

function makeRejectingChain(error: Error) {
  const chain: any = {};
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.skip = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockRejectedValue(error);
  return chain;
}

const adminToken = signJWT({ userId: "admin1", email: "admin@example.com" });
const userToken = signJWT({ userId: "user1", email: "user1@example.com" });

function mockAsAdmin() {
  mockedUserFindById.mockReturnValue({
    select: jest.fn().mockResolvedValue({ isAdmin: true }),
  });
}

function mockAsNonAdmin() {
  mockedUserFindById.mockReturnValue({
    select: jest.fn().mockResolvedValue({ isAdmin: false }),
  });
}

beforeEach(() => {
  mockAsAdmin();
});

describe("admin auth gating (exercised once via pageviews)", () => {
  it("rejects with no Authorization header", async () => {
    const res = await request(app).get("/admin/analytics/pageviews");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 1, message: "No authorization header" });
  });

  it("rejects a non-admin user with 403", async () => {
    mockAsNonAdmin();
    const res = await request(app)
      .get("/admin/analytics/pageviews")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 1, message: "Admin access required" });
  });

  it("rejects when the user doesn't exist", async () => {
    mockedUserFindById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = await request(app)
      .get("/admin/analytics/pageviews")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("rejects an invalid token with 401", async () => {
    const res = await request(app)
      .get("/admin/analytics/pageviews")
      .set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });

  it("allows an admin user through", async () => {
    mockedAuditFind.mockReturnValue(makeQueryChain([]));
    const res = await request(app)
      .get("/admin/analytics/pageviews")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe("GET /admin/analytics/pageviews", () => {
  it("groups page views by date and page, defaulting missing page to 'unknown'", async () => {
    mockedAuditFind.mockReturnValue(
      makeQueryChain([
        { page: "/dashboard", createdAt: new Date("2026-01-01T10:00:00Z"), email: "a@x.com" },
        { page: "/dashboard", createdAt: new Date("2026-01-01T11:00:00Z"), email: "b@x.com" },
        { page: null, createdAt: new Date("2026-01-02T10:00:00Z"), email: "c@x.com" },
      ])
    );

    const res = await request(app)
      .get("/admin/analytics/pageviews")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.totalViews).toBe(3);
    expect(res.body.data.uniquePages).toBe(2);
    expect(res.body.data.grouped["2026-01-01"]["/dashboard"]).toBe(2);
    expect(res.body.data.grouped["2026-01-02"]["unknown"]).toBe(1);
  });

  it("filters by the page query param", async () => {
    const chain = makeQueryChain([]);
    mockedAuditFind.mockReturnValue(chain);

    await request(app)
      .get("/admin/analytics/pageviews?page=/dashboard&period=30d")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(mockedAuditFind).toHaveBeenCalledWith(
      expect.objectContaining({ page: "/dashboard" })
    );
  });

  it("returns 500 when the query fails", async () => {
    mockedAuditFind.mockReturnValue(makeRejectingChain(new Error("db down")));

    const res = await request(app)
      .get("/admin/analytics/pageviews")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error fetching analytics" });
  });
});

describe("GET /admin/analytics/linkclicks", () => {
  it("aggregates link click counts, defaulting missing link to 'unknown'", async () => {
    mockedAuditFind.mockReturnValue(
      makeQueryChain([
        { metadata: { link: "https://a.com" }, createdAt: new Date() },
        { metadata: { link: "https://a.com" }, createdAt: new Date() },
        { metadata: {}, createdAt: new Date() },
      ])
    );

    const res = await request(app)
      .get("/admin/analytics/linkclicks")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalClicks).toBe(3);
    expect(res.body.data.linkStats["https://a.com"]).toBe(2);
    expect(res.body.data.linkStats["unknown"]).toBe(1);
  });

  it("returns 500 when the query fails", async () => {
    mockedAuditFind.mockReturnValue(makeRejectingChain(new Error("db down")));

    const res = await request(app)
      .get("/admin/analytics/linkclicks")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error fetching analytics" });
  });
});

describe("GET /admin/audit-logs", () => {
  it("uses default limit/skip when not provided", async () => {
    const chain = makeQueryChain([{ email: "a@x.com" }]);
    mockedAuditFind.mockReturnValue(chain);
    mockedAuditCount.mockResolvedValue(1);

    const res = await request(app)
      .get("/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(100);
    expect(res.body.data.skip).toBe(0);
    expect(res.body.data.total).toBe(1);
    expect(chain.limit).toHaveBeenCalledWith(100);
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(mockedAuditFind).toHaveBeenCalledWith({});
  });

  it("applies userEmail, activityType, limit and skip filters", async () => {
    const chain = makeQueryChain([]);
    mockedAuditFind.mockReturnValue(chain);
    mockedAuditCount.mockResolvedValue(0);

    await request(app)
      .get("/admin/audit-logs?userEmail=a@x.com&activityType=LOGIN&limit=5&skip=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(mockedAuditFind).toHaveBeenCalledWith({
      email: "a@x.com",
      activityType: "LOGIN",
    });
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(chain.skip).toHaveBeenCalledWith(10);
  });

  it("returns 500 when the query fails", async () => {
    mockedAuditFind.mockReturnValue(makeRejectingChain(new Error("db down")));

    const res = await request(app)
      .get("/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error fetching audit logs" });
  });
});

describe("GET /admin/users", () => {
  it("computes user stats", async () => {
    mockedUserFind.mockReturnValue(
      makeQueryChain([
        { email: "a@x.com", wise: "categorywise", twitterUsername: "a" },
        { email: "b@x.com", wise: "customProfiles", twitterUsername: null },
        { email: "c@x.com", wise: "categorywise", twitterUsername: null },
      ])
    );

    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toEqual({
      total: 3,
      categorywise: 2,
      customProfiles: 1,
      withTwitter: 1,
    });
  });

  it("returns 500 when the query fails", async () => {
    mockedUserFind.mockReturnValue(makeRejectingChain(new Error("db down")));

    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ code: 1, message: "Error fetching users" });
  });
});

describe("GET /admin/analytics/activities", () => {
  it("aggregates activity counts by type and echoes the period", async () => {
    mockedAuditFind.mockReturnValue(
      makeQueryChain([
        { activityType: "LOGIN" },
        { activityType: "LOGIN" },
        { activityType: "LOGOUT" },
      ])
    );

    const res = await request(app)
      .get("/admin/analytics/activities?period=1d")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalActivities).toBe(3);
    expect(res.body.data.activityStats).toEqual({ LOGIN: 2, LOGOUT: 1 });
    expect(res.body.data.period).toBe("1d");
  });

  it("returns 500 when the query fails", async () => {
    mockedAuditFind.mockReturnValue(makeRejectingChain(new Error("db down")));

    const res = await request(app)
      .get("/admin/analytics/activities")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: 1,
      message: "Error fetching activity stats",
    });
  });
});
