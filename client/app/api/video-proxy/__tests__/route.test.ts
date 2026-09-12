/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET, HEAD, OPTIONS } from "../route";

const TWITTER_VIDEO_URL = "https://video.twimg.com/ext_tw_video/abc/vid.mp4";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init);
}

describe("OPTIONS /api/video-proxy", () => {
  it("returns CORS preflight headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});

describe("HEAD /api/video-proxy", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 when url param is missing", async () => {
    const res = await HEAD(makeRequest("http://localhost/api/video-proxy"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-twitter video URL", async () => {
    const res = await HEAD(
      makeRequest("http://localhost/api/video-proxy?url=https://evil.com/vid.mp4")
    );
    expect(res.status).toBe(400);
  });

  it("returns metadata headers for a valid twitter video URL", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-length": "12345",
        "content-type": "video/mp4",
      }),
    } as Response);

    const res = await HEAD(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`
      )
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Length")).toBe("12345");
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
  });

  it("passes through the upstream status when the fetch fails", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as Response);

    const res = await HEAD(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`
      )
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 when fetch throws", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("boom"));

    const res = await HEAD(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`
      )
    );
    expect(res.status).toBe(500);
  });
});

describe("GET /api/video-proxy", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 400 (JSON) when url param is missing", async () => {
    const res = await GET(makeRequest("http://localhost/api/video-proxy"));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Video URL is required" });
  });

  it("returns 400 (JSON) for a non-twitter video URL", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/video-proxy?url=https://evil.com/vid.mp4")
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid video source" });
  });

  it("streams the full video on 200", async () => {
    const buffer = new TextEncoder().encode("videobytes").buffer;
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "10" }),
      arrayBuffer: async () => buffer,
    } as unknown as Response);

    const res = await GET(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`
      )
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
    expect(res.headers.get("Content-Length")).toBe("10");
  });

  it("forwards Range requests and returns 206 partial content", async () => {
    const buffer = new TextEncoder().encode("partial").buffer;
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 206,
      headers: new Headers({
        "content-range": "bytes 0-99/200",
        "content-length": "100",
      }),
      arrayBuffer: async () => buffer,
    } as unknown as Response);

    const res = await GET(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`,
        { headers: { Range: "bytes=0-99" } }
      )
    );

    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe("bytes 0-99/200");
    expect(res.headers.get("Content-Length")).toBe("100");
  });

  it("returns a JSON error with the upstream status when the fetch fails outright", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
    } as Response);

    const res = await GET(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`
      )
    );
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body).toEqual({ error: "Failed to fetch video" });
  });

  it("returns 500 when fetch throws", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("boom"));

    const res = await GET(
      makeRequest(
        `http://localhost/api/video-proxy?url=${encodeURIComponent(
          TWITTER_VIDEO_URL
        )}`
      )
    );
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "Failed to proxy video" });
  });
});
