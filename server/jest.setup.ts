// Force a predictable, isolated environment for every test run so real
// secrets/hosts from server/.env (production Mongo, Redis, SendGrid, etc.)
// never leak in. config/db and config/redis are additionally hard-mocked
// via jest.config.js moduleNameMapper as a second line of defense.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "7d";
process.env.SENDGRID_API_KEY = "test-sendgrid-key";
process.env.FROM_EMAIL = "test@example.com";
process.env.CLIENT = "test-client-id";
process.env.SECRET = "test-client-secret";
process.env.SERVER = "http://localhost:5001";
process.env.ORIGIN = "http://localhost:3000";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.OPENAI = "test-openai-key";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.MONGO_URL = "mongodb://disabled-in-tests";
process.env.REDIS_URL = "redis://disabled-in-tests";

// The db/redis mocks below are never-connecting stand-ins, but the
// underlying mongoose Connection and ioredis client still hold open handles
// (internal timers) that stop the Jest process from exiting cleanly. Close
// them after every test file so `jest` exits promptly without --forceExit.
afterAll(async () => {
  const db = (await import("./src/__mocks__/db")).default;
  await db.close().catch(() => undefined);

  const redis = (await import("./src/__mocks__/redis")).default;
  redis.disconnect();
});
