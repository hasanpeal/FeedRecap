/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // isolatedModules: full type-checking across the whole program (the
  // ts-jest default) blows past a 4GB heap and OOM-crashes on this project's
  // combined mongoose/openai/bullmq/passport type graph. Per-file transpile
  // only — `tsc`/`npm run build` is still the source of truth for type
  // errors, tests only need correct runtime behavior.
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
  rootDir: ".",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  // Safety: these two modules open real connections to production MongoDB
  // and Redis on import (see config/db.ts, config/redis.ts). Every test run
  // — no matter what it imports — must get the disconnected/fake stand-ins
  // below instead of ever dialing out to prod infra.
  moduleNameMapper: {
    "(.*)/config/db$": "<rootDir>/src/__mocks__/db.ts",
    "(.*)/config/redis$": "<rootDir>/src/__mocks__/redis.ts",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/config/**",
    "!src/__mocks__/**",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
};
