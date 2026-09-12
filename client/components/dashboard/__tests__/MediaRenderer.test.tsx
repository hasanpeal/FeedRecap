import { render, screen } from "@testing-library/react";
import { MediaRenderer } from "../MediaRenderer";
import { Post } from "../types";

const basePost: Post = {
  username: "u",
  time: "2026-09-01T00:00:00.000Z",
  likes: 0,
  category: "",
  text: "",
  tweet_id: "1",
};

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

describe("MediaRenderer", () => {
  const desktopUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const iosUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";

  afterEach(() => {
    setUserAgent(desktopUA);
  });

  it("renders nothing when there is no video or media", () => {
    setUserAgent(desktopUA);
    const { container } = render(<MediaRenderer post={basePost} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a <video> element with a proxied twimg source on desktop", () => {
    setUserAgent(desktopUA);
    const post: Post = {
      ...basePost,
      video: "https://video.twimg.com/clip.mp4",
    };
    const { container } = render(<MediaRenderer post={post} />);
    const video = container.querySelector("video");
    expect(video).toBeInTheDocument();
    const source = container.querySelector("source");
    expect(source?.getAttribute("src")).toBe(
      `/api/video-proxy?url=${encodeURIComponent(
        "https://video.twimg.com/clip.mp4"
      )}`
    );
  });

  it("does not proxy non-twimg video sources", () => {
    setUserAgent(desktopUA);
    const post: Post = { ...basePost, video: "https://example.com/clip.mp4" };
    const { container } = render(<MediaRenderer post={post} />);
    const source = container.querySelector("source");
    expect(source?.getAttribute("src")).toBe("https://example.com/clip.mp4");
  });

  it("renders an external image for mediaThumbnail (desktop, no video)", () => {
    setUserAgent(desktopUA);
    const post: Post = {
      ...basePost,
      mediaThumbnail: "https://pbs.twimg.com/media/x.jpg",
    };
    render(<MediaRenderer post={post} />);
    const img = screen.getByAltText("Tweet media");
    expect(img.getAttribute("src")).toBe("https://pbs.twimg.com/media/x.jpg");
  });

  it("renders a next/image for a local mediaThumbnail path", () => {
    setUserAgent(desktopUA);
    const post: Post = { ...basePost, mediaThumbnail: "/local/x.jpg" };
    render(<MediaRenderer post={post} />);
    expect(screen.getByAltText("Tweet media")).toBeInTheDocument();
  });

  it("on iOS, renders a poster image instead of a <video> tag", () => {
    setUserAgent(iosUA);
    const post: Post = {
      ...basePost,
      video: "https://video.twimg.com/clip.mp4",
      videoThumbnail: "https://pbs.twimg.com/thumb.jpg",
    };
    const { container } = render(<MediaRenderer post={post} />);
    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.getByAltText("Video Poster")).toBeInTheDocument();
  });

  it("on iOS with a local video thumbnail, renders a next/image poster", () => {
    setUserAgent(iosUA);
    const post: Post = {
      ...basePost,
      video: "https://video.twimg.com/clip.mp4",
      videoThumbnail: "/local/thumb.jpg",
    };
    const { container } = render(<MediaRenderer post={post} />);
    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.getByAltText("Video Poster")).toBeInTheDocument();
  });

  it("falls back to the placeholder on error for an external iOS video poster", () => {
    setUserAgent(iosUA);
    const post: Post = {
      ...basePost,
      video: "https://video.twimg.com/clip.mp4",
      videoThumbnail: "https://pbs.twimg.com/thumb.jpg",
    };
    render(<MediaRenderer post={post} />);
    const img = screen.getByAltText("Video Poster") as HTMLImageElement;
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.src).toContain("/placeholder.svg");
  });

  it("falls back to the placeholder on error for a local iOS video poster", () => {
    setUserAgent(iosUA);
    const post: Post = {
      ...basePost,
      video: "https://video.twimg.com/clip.mp4",
      videoThumbnail: "/local/thumb.jpg",
    };
    render(<MediaRenderer post={post} />);
    const img = screen.getByAltText("Video Poster") as HTMLImageElement;
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.src).toContain("/placeholder.svg");
  });

  it("falls back to the placeholder on error for an external mediaThumbnail image", () => {
    setUserAgent(desktopUA);
    const post: Post = {
      ...basePost,
      mediaThumbnail: "https://pbs.twimg.com/media/x.jpg",
    };
    render(<MediaRenderer post={post} />);
    const img = screen.getByAltText("Tweet media") as HTMLImageElement;
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.src).toContain("/placeholder.svg");
  });

  it("falls back to the placeholder on error for a local mediaThumbnail image", () => {
    setUserAgent(desktopUA);
    const post: Post = { ...basePost, mediaThumbnail: "/local/x.jpg" };
    render(<MediaRenderer post={post} />);
    const img = screen.getByAltText("Tweet media") as HTMLImageElement;
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.src).toContain("/placeholder.svg");
  });
});
