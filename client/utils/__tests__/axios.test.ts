jest.mock("axios", () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

import apiClient from "../axios";

const mockAxiosInstance = apiClient as unknown as {
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
};
const mockRequestUse = mockAxiosInstance.interceptors.request.use;
const mockResponseUse = mockAxiosInstance.interceptors.response.use;

// jsdom's window.location has non-configurable get/set accessors (matching
// real browsers), so it can't be swapped out with a plain mock object.
// `history.pushState` is genuinely implemented in jsdom and updates
// `location.pathname` without triggering navigation, so it works for setting
// up the pathname-dependent branches. To observe whether the code *attempted*
// `window.location.href = ...` (jsdom's navigation isn't implemented and
// logs "Not implemented: navigation" via console.error instead of actually
// navigating), we spy on console.error as a proxy for "a redirect happened".
function setPathname(pathname: string) {
  window.history.pushState({}, "", pathname);
}

function spyOnNavigationAttempt() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}

function attemptedNavigation(spy: jest.SpyInstance) {
  return spy.mock.calls.some((args) =>
    args.some((a) => String(a).toLowerCase().includes("navigation"))
  );
}

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("is the axios instance created by axios.create", () => {
    expect(apiClient).toBe(mockAxiosInstance);
  });

  describe("request interceptor", () => {
    const [onFulfilled, onRejected] = mockRequestUse.mock.calls[0];

    it("adds an Authorization header when a token is stored", () => {
      localStorage.setItem("token", "abc123");
      const config: any = { headers: {} };
      const result = onFulfilled(config);
      expect(result.headers.Authorization).toBe("Bearer abc123");
    });

    it("leaves the config untouched when there is no token", () => {
      const config: any = { headers: {} };
      const result = onFulfilled(config);
      expect(result.headers.Authorization).toBeUndefined();
    });

    it("rejects the promise on a request error", async () => {
      const error = new Error("network fail");
      await expect(onRejected(error)).rejects.toBe(error);
    });
  });

  describe("response interceptor", () => {
    const [onFulfilled, onRejected] = mockResponseUse.mock.calls[0];

    it("passes successful responses through unchanged", () => {
      const response = { data: "ok" };
      expect(onFulfilled(response)).toBe(response);
    });

    it("clears the token and redirects to /signin on a 401 from a non-login call, off signin/signup", async () => {
      localStorage.setItem("token", "abc123");
      setPathname("/dashboard");
      const spy = spyOnNavigationAttempt();
      const error = {
        response: { status: 401 },
        config: { url: "/getUserDetails" },
      };

      await expect(onRejected(error)).rejects.toBe(error);

      expect(localStorage.getItem("token")).toBeNull();
      expect(attemptedNavigation(spy)).toBe(true);
      spy.mockRestore();
    });

    it("does not redirect when already on the /signin page", async () => {
      localStorage.setItem("token", "abc123");
      setPathname("/signin");
      const spy = spyOnNavigationAttempt();
      const error = { response: { status: 401 }, config: { url: "/getUserDetails" } };

      await expect(onRejected(error)).rejects.toBe(error);

      expect(attemptedNavigation(spy)).toBe(false);
      spy.mockRestore();
    });

    it("does not redirect when already on the /signup page", async () => {
      setPathname("/signup");
      const spy = spyOnNavigationAttempt();
      const error = { response: { status: 401 }, config: { url: "/getUserDetails" } };

      await expect(onRejected(error)).rejects.toBe(error);

      expect(attemptedNavigation(spy)).toBe(false);
      spy.mockRestore();
    });

    it("does not redirect when the failing request was the /login call itself", async () => {
      setPathname("/dashboard");
      const spy = spyOnNavigationAttempt();
      const error = { response: { status: 401 }, config: { url: "/login" } };

      await expect(onRejected(error)).rejects.toBe(error);

      expect(attemptedNavigation(spy)).toBe(false);
      spy.mockRestore();
    });

    it("leaves the stored token alone for non-401 errors", async () => {
      localStorage.setItem("token", "keepme");
      const error = { response: { status: 500 }, config: {} };

      await expect(onRejected(error)).rejects.toBe(error);

      expect(localStorage.getItem("token")).toBe("keepme");
    });

    it("handles an error with no response object at all", async () => {
      const error = { config: {} };
      await expect(onRejected(error)).rejects.toBe(error);
    });
  });
});
