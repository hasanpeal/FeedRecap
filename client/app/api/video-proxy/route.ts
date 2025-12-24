import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    // Validate that the URL is from Twitter
    if (
      !videoUrl.includes("video.twimg.com") &&
      !videoUrl.includes("twimg.com")
    ) {
      return new NextResponse(null, { status: 400 });
    }

    // Make a HEAD request to get video metadata
    const response = await fetch(videoUrl, {
      method: "HEAD",
      headers: {
        Referer: "https://twitter.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type") || "video/mp4";

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength || "0",
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
        "Access-Control-Expose-Headers":
          "Content-Range, Content-Length, Accept-Ranges",
      },
    });
  } catch (error) {
    console.error("Video proxy HEAD error:", error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Video URL is required" },
      { status: 400 }
    );
  }

  try {
    // Validate that the URL is from Twitter
    if (
      !videoUrl.includes("video.twimg.com") &&
      !videoUrl.includes("twimg.com")
    ) {
      return NextResponse.json(
        { error: "Invalid video source" },
        { status: 400 }
      );
    }

    // Get Range header from request (Safari requires this for video playback)
    const rangeHeader = request.headers.get("range");

    // Prepare headers for the fetch request
    const fetchHeaders: HeadersInit = {
      Referer: "https://twitter.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    // Forward Range header if present
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    // Fetch the video from Twitter
    const response = await fetch(videoUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: "Failed to fetch video" },
        { status: response.status }
      );
    }

    // Get the video data
    const videoBuffer = await response.arrayBuffer();

    // Prepare response headers
    const responseHeaders: HeadersInit = {
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Expose-Headers":
        "Content-Range, Content-Length, Accept-Ranges",
      "Accept-Ranges": "bytes",
    };

    // Handle Range requests (206 Partial Content)
    if (rangeHeader && response.status === 206) {
      const contentRange = response.headers.get("content-range");
      if (contentRange) {
        responseHeaders["Content-Range"] = contentRange;
      }
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
      }

      return new NextResponse(videoBuffer, {
        status: 206,
        headers: responseHeaders,
      });
    }

    // If Range was requested but we got 200, Safari might need the full content length
    if (rangeHeader && response.status === 200) {
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
        // Safari might need Content-Range even for full content
        responseHeaders["Content-Range"] = `bytes 0-${
          parseInt(contentLength) - 1
        }/${contentLength}`;
      }
    }

    // Handle full content (200 OK)
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy video" },
      { status: 500 }
    );
  }
}
