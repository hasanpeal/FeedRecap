// Smoke test: importing the full app (and therefore config/db, config/redis,
// and every job/queue module transitively) must never attempt a real network
// connection to production MongoDB/Redis. If this test hangs or errors with
// a connection failure, the moduleNameMapper mocks in jest.config.js are not
// doing their job — do not delete or relax this test.
import request from "supertest";
import app from "../app";

describe("app (smoke)", () => {
  it("imports without opening a real DB/Redis connection and responds to requests", async () => {
    const res = await request(app).get("/some-unknown-route");
    expect(res.status).toBe(404);
  });
});
