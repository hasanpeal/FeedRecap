import { formatCount, formatTime, getInitials, isIOS, playSound, timeAgo } from "../utils";

describe("formatTime", () => {
  beforeEach(() => {
    // Sep 11 2026, 3:30 PM local time — matches how `formatTime` compares
    // against `new Date()` internally, so constructing fixture dates with
    // the local `Date(year, month, day, ...)` form (as below) keeps this
    // test timezone-independent.
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 11, 15, 30, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("labels a timestamp from today as 'Today at <time>'", () => {
    const today = new Date(2026, 8, 11, 9, 0, 0);
    const expectedTime = today.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    expect(formatTime(today)).toBe(`Today at ${expectedTime}`);
  });

  it("labels a timestamp from yesterday as 'Yesterday at <time>'", () => {
    const yesterday = new Date(2026, 8, 10, 9, 0, 0);
    const expectedTime = yesterday.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    expect(formatTime(yesterday)).toBe(`Yesterday at ${expectedTime}`);
  });

  it("uses a month/day format with no year for an older date in the current year", () => {
    const older = new Date(2026, 0, 5, 9, 0, 0);
    const expectedDate = older.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: undefined,
    });
    const expectedTime = older.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    expect(formatTime(older)).toBe(`${expectedDate} at ${expectedTime}`);
  });

  it("includes the year for a date from a previous year", () => {
    const oldYear = new Date(2024, 5, 15, 9, 0, 0);
    const expectedDate = oldYear.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const expectedTime = oldYear.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    expect(formatTime(oldYear)).toBe(`${expectedDate} at ${expectedTime}`);
  });
});

describe("timeAgo", () => {
  const NOW = new Date(2026, 8, 11, 12, 0, 0).getTime();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns seconds ago for a very recent timestamp", () => {
    expect(timeAgo(new Date(NOW - 30 * 1000))).toBe("30 seconds ago");
  });

  it("returns singular minute ago", () => {
    expect(timeAgo(new Date(NOW - 60 * 1000))).toBe("1 minute ago");
  });

  it("returns plural minutes ago", () => {
    expect(timeAgo(new Date(NOW - 5 * 60 * 1000))).toBe("5 minutes ago");
  });

  it("returns hours ago", () => {
    expect(timeAgo(new Date(NOW - 3 * 3600 * 1000))).toBe("3 hours ago");
  });

  it("returns days ago", () => {
    expect(timeAgo(new Date(NOW - 2 * 86400 * 1000))).toBe("2 days ago");
  });

  it("returns months ago", () => {
    expect(timeAgo(new Date(NOW - 2 * 2592000 * 1000))).toBe("2 months ago");
  });

  it("returns years ago", () => {
    expect(timeAgo(new Date(NOW - 2 * 31536000 * 1000))).toBe("2 years ago");
  });
});

describe("formatCount", () => {
  it("returns the raw number below 1000", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(0)).toBe("0");
  });

  it("formats thousands with a K suffix", () => {
    expect(formatCount(1500)).toBe("1.5K");
    expect(formatCount(999999)).toBe("1000.0K");
  });

  it("formats millions with an M suffix", () => {
    expect(formatCount(2500000)).toBe("2.5M");
  });
});

describe("getInitials", () => {
  it("builds initials from underscore/dot/dash separated parts", () => {
    expect(getInitials("john_doe")).toBe("JD");
    expect(getInitials("jane.smith")).toBe("JS");
    expect(getInitials("foo-bar")).toBe("FB");
  });

  it("caps at two characters", () => {
    expect(getInitials("a.b.c.d")).toBe("AB");
  });

  it("uppercases a single-part username", () => {
    expect(getInitials("solo")).toBe("S");
  });
});

describe("isIOS", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it("returns false for a non-iOS user agent", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
    expect(isIOS()).toBe(false);
  });

  it("returns true for an iPhone user agent", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });
    expect(isIOS()).toBe(true);
  });
});

describe("playSound", () => {
  // jsdom has no AudioContext implementation; stub just the methods
  // playSound actually calls, and assert it wires the oscillator through
  // the gain node without throwing.
  class FakeOscillator {
    type = "";
    frequency = { setValueAtTime: jest.fn() };
    connect = jest.fn();
    start = jest.fn();
    stop = jest.fn();
  }
  class FakeGain {
    gain = { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() };
    connect = jest.fn();
  }

  let lastOscillator: FakeOscillator;
  let lastGain: FakeGain;

  beforeEach(() => {
    (window as any).AudioContext = jest.fn().mockImplementation(() => {
      lastOscillator = new FakeOscillator();
      lastGain = new FakeGain();
      return {
        currentTime: 0,
        destination: {},
        createOscillator: () => lastOscillator,
        createGain: () => lastGain,
      };
    });
  });

  afterEach(() => {
    delete (window as any).AudioContext;
  });

  it("creates a short sine-wave tick without throwing", () => {
    expect(() => playSound()).not.toThrow();

    expect(lastOscillator.type).toBe("sine");
    expect(lastOscillator.connect).toHaveBeenCalledWith(lastGain);
    expect(lastGain.connect).toHaveBeenCalled();
    expect(lastOscillator.start).toHaveBeenCalled();
    expect(lastOscillator.stop).toHaveBeenCalled();
  });
});
