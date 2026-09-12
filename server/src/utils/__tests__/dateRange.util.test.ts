import { getStartDateForPeriod } from "../dateRange.util";

describe("getStartDateForPeriod", () => {
  const REAL_DATE_NOW = Date.now;
  const fixedNow = new Date("2026-09-11T12:00:00.000Z");

  beforeAll(() => {
    global.Date.now = jest.fn(() => fixedNow.getTime());
  });

  afterAll(() => {
    global.Date.now = REAL_DATE_NOW;
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 1 day back for '1d'", () => {
    const result = getStartDateForPeriod("1d");
    expect(result.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("returns 3 days back for '3d'", () => {
    const result = getStartDateForPeriod("3d");
    expect(result.toISOString()).toBe("2026-09-08T12:00:00.000Z");
  });

  it("returns 7 days back for '7d'", () => {
    const result = getStartDateForPeriod("7d");
    expect(result.toISOString()).toBe("2026-09-04T12:00:00.000Z");
  });

  it("returns 30 days back for '30d'", () => {
    const result = getStartDateForPeriod("30d");
    expect(result.toISOString()).toBe("2026-08-12T12:00:00.000Z");
  });

  it("returns 6 months back for '6m'", () => {
    const result = getStartDateForPeriod("6m");
    expect(result.toISOString()).toBe("2026-03-11T12:00:00.000Z");
  });

  it("returns 1 year back for '1y'", () => {
    const result = getStartDateForPeriod("1y");
    expect(result.toISOString()).toBe("2025-09-11T12:00:00.000Z");
  });

  it("defaults to 7 days back for an unrecognized string", () => {
    const result = getStartDateForPeriod("bogus");
    expect(result.toISOString()).toBe("2026-09-04T12:00:00.000Z");
  });

  it("defaults to 7 days back for undefined", () => {
    const result = getStartDateForPeriod(undefined);
    expect(result.toISOString()).toBe("2026-09-04T12:00:00.000Z");
  });

  it("defaults to 7 days back for null", () => {
    const result = getStartDateForPeriod(null);
    expect(result.toISOString()).toBe("2026-09-04T12:00:00.000Z");
  });

  it("defaults to 7 days back for a non-string type", () => {
    const result = getStartDateForPeriod(42);
    expect(result.toISOString()).toBe("2026-09-04T12:00:00.000Z");
  });
});
