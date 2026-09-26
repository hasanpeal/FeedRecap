const requestUse = jest.fn();
const responseUse = jest.fn();
const post = jest.fn();
const request = jest.fn();

jest.mock("axios", () => {
  const mockAxios: any = (...args: any[]) => request(...args);
  mockAxios.post = (...args: any[]) => post(...args);
  mockAxios.interceptors = {
    request: { use: (...args: any[]) => requestUse(...args) },
    response: { use: (...args: any[]) => responseUse(...args) },
  };
  return { __esModule: true, default: mockAxios };
});

describe("auth refresh interceptor", () => {
  let onRequest: (config: any) => any;
  let onResponseError: (error: any) => Promise<any>;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    localStorage.clear();
    process.env.NEXT_PUBLIC_SERVER = "https://api.example.com";
    await import("../authRefresh");
    onRequest = requestUse.mock.calls[0][0];
    onResponseError = responseUse.mock.calls[0][1];
  });

  it("enables credentials only for API requests", () => {
    expect(onRequest({ url: "https://api.example.com/data" }).withCredentials).toBe(true);
    expect(onRequest({ url: "https://other.example.com/data" }).withCredentials).toBeUndefined();
  });

  it("refreshes and retries an expired authenticated API request", async () => {
    localStorage.setItem("token", "expired");
    post.mockResolvedValueOnce({ data: { token: "fresh-token" } });
    request.mockResolvedValueOnce({ data: { ok: true } });
    const config: any = { url: "https://api.example.com/data", headers: {} };

    const result = await onResponseError({ response: { status: 401 }, config });

    expect(post).toHaveBeenCalledWith(
      "https://api.example.com/refresh",
      {},
      expect.objectContaining({ withCredentials: true })
    );
    expect(localStorage.getItem("token")).toBe("fresh-token");
    expect(config.headers.Authorization).toBe("Bearer fresh-token");
    expect(result.data.ok).toBe(true);
  });

  it("clears the access token when refresh fails", async () => {
    localStorage.setItem("token", "expired");
    post.mockRejectedValueOnce(new Error("expired"));

    await expect(
      onResponseError({
        response: { status: 401 },
        config: { url: "https://api.example.com/data", headers: {} },
      })
    ).rejects.toBeDefined();

    expect(localStorage.getItem("token")).toBeNull();
  });

  it("does not refresh unrelated 401 responses", async () => {
    localStorage.setItem("token", "expired");
    const error = {
      response: { status: 401 },
      config: { url: "https://other.example.com/data", headers: {} },
    };
    await expect(onResponseError(error)).rejects.toBe(error);
    expect(post).not.toHaveBeenCalled();
  });
});
