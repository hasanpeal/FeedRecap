import axios from "axios";

describe("auth refresh interceptor", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    process.env.NEXT_PUBLIC_SERVER = "https://api.example.com";
  });

  it("enables credentials for API requests", async () => {
    await import("../authRefresh");
    const handler = (axios.interceptors.request as any).handlers.at(-1).fulfilled;
    const config = handler({ url: "https://api.example.com/data" });
    expect(config.withCredentials).toBe(true);
  });

  it("leaves unrelated requests alone", async () => {
    await import("../authRefresh");
    const handler = (axios.interceptors.request as any).handlers.at(-1).fulfilled;
    const config = handler({ url: "https://other.example.com/data" });
    expect(config.withCredentials).toBeUndefined();
  });

  it("refreshes once and retries a failed authenticated API request", async () => {
    localStorage.setItem("token", "expired");
    await import("../authRefresh");
    const responseHandler = (axios.interceptors.response as any).handlers.at(-1).rejected;

    const post = jest.spyOn(axios, "post").mockResolvedValueOnce({
      data: { token: "fresh-token" },
    } as any);
    const request = jest.spyOn(axios, "request").mockResolvedValueOnce({
      data: { ok: true },
    } as any);

    const config: any = {
      url: "https://api.example.com/data",
      headers: {},
    };
    const result = await responseHandler({
      response: { status: 401 },
      config,
    });

    expect(post).toHaveBeenCalledWith(
      "https://api.example.com/refresh",
      {},
      expect.objectContaining({ withCredentials: true })
    );
    expect(localStorage.getItem("token")).toBe("fresh-token");
    expect(config.headers.Authorization).toBe("Bearer fresh-token");
    expect(result.data.ok).toBe(true);
    post.mockRestore();
    request.mockRestore();
  });

  it("clears the access token when refresh fails", async () => {
    localStorage.setItem("token", "expired");
    await import("../authRefresh");
    const responseHandler = (axios.interceptors.response as any).handlers.at(-1).rejected;
    const post = jest.spyOn(axios, "post").mockRejectedValueOnce(new Error("expired"));

    await expect(
      responseHandler({
        response: { status: 401 },
        config: { url: "https://api.example.com/data", headers: {} },
      })
    ).rejects.toBeDefined();

    expect(localStorage.getItem("token")).toBeNull();
    post.mockRestore();
  });
});
