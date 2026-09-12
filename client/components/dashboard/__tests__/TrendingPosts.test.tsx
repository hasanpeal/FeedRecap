import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrendingPosts } from "../TrendingPosts";
import { Post } from "../types";

const post: Post = {
  username: "bob",
  time: "2026-09-11T11:00:00.000Z",
  likes: 10,
  category: "Tech",
  text: "trending text",
  tweet_id: "t1",
};

describe("TrendingPosts", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    localStorage.clear();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("renders skeleton cards while loading", () => {
    const { container } = render(
      <TrendingPosts posts={[]} loadingPosts={true} />
    );
    expect(
      container.querySelectorAll(".trending-card-skeleton")
    ).toHaveLength(5);
  });

  it("renders an empty state when there are no posts", () => {
    render(<TrendingPosts posts={[]} loadingPosts={false} />);
    expect(screen.getByText("No trending posts")).toBeInTheDocument();
  });

  it("renders post text when there is no media", () => {
    render(<TrendingPosts posts={[post]} loadingPosts={false} />);
    expect(screen.getByText("trending text")).toBeInTheDocument();
    expect(screen.getByText("@bob")).toBeInTheDocument();
  });

  it("renders an external image when mediaThumbnail is an http(s) url", () => {
    const withMedia = { ...post, mediaThumbnail: "https://x.com/img.jpg" };
    render(<TrendingPosts posts={[withMedia]} loadingPosts={false} />);
    const img = screen.getByAltText("Tweet media") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://x.com/img.jpg");
  });

  it("renders a next/image for a local mediaThumbnail path", () => {
    const withMedia = { ...post, mediaThumbnail: "/local.jpg" };
    render(<TrendingPosts posts={[withMedia]} loadingPosts={false} />);
    expect(screen.getByAltText("Tweet media")).toBeInTheDocument();
  });

  it("falls back to the placeholder on error for an external trending image", () => {
    const withMedia = { ...post, mediaThumbnail: "https://x.com/img.jpg" };
    render(<TrendingPosts posts={[withMedia]} loadingPosts={false} />);
    const img = screen.getByAltText("Tweet media") as HTMLImageElement;
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.src).toContain("/placeholder.svg");
  });

  it("falls back to the placeholder on error for a local trending image", () => {
    const withMedia = { ...post, mediaThumbnail: "/local.jpg" };
    render(<TrendingPosts posts={[withMedia]} loadingPosts={false} />);
    const img = screen.getByAltText("Tweet media") as HTMLImageElement;
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.src).toContain("/placeholder.svg");
  });

  it("does not log a link click when there is no token", async () => {
    const user = userEvent.setup();
    render(<TrendingPosts posts={[post]} loadingPosts={false} />);
    await user.click(screen.getByText("View Post"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("logs a link click via fetch when a token is present", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "tok");
    render(<TrendingPosts posts={[post]} loadingPosts={false} />);
    await user.click(screen.getByText("View Post"));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/logLinkClick"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("swallows fetch errors when logging a link click", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "tok");
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network"));
    render(<TrendingPosts posts={[post]} loadingPosts={false} />);
    await user.click(screen.getByText("View Post"));
    expect(global.fetch).toHaveBeenCalled();
  });
});
