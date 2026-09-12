import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostCard } from "../PostCard";
import { Post } from "../types";
import apiClient from "@/utils/axios";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

jest.mock("@/utils/axios", () => ({
  __esModule: true,
  default: { post: jest.fn().mockResolvedValue({ data: {} }) },
}));

const basePost: Post = {
  username: "alice",
  time: "2026-09-01T12:00:00.000Z",
  likes: 42,
  category: "Tech",
  text: "short post",
  tweet_id: "1",
};

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

describe("PostCard", () => {
  const originalOpen = window.open;

  beforeEach(() => {
    window.open = jest.fn();
    localStorage.clear();
    jest.clearAllMocks();
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
  });

  afterAll(() => {
    window.open = originalOpen;
  });

  it("renders username, category badge, and like count", () => {
    render(
      <PostCard
        post={basePost}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
      />
    );
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("short post")).toBeInTheDocument();
  });

  it("does not show the category badge in customProfiles mode", () => {
    render(
      <PostCard
        post={basePost}
        wise="customProfiles"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
      />
    );
    expect(screen.queryByText("Tech")).not.toBeInTheDocument();
  });

  it("truncates long text and toggles Show More/Show Less", async () => {
    const user = userEvent.setup();
    const longText = "x".repeat(300);
    const onToggleExpansion = jest.fn();
    const { rerender } = render(
      <PostCard
        post={{ ...basePost, text: longText }}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={onToggleExpansion}
      />
    );
    expect(screen.getByText(`${"x".repeat(250)}...`)).toBeInTheDocument();
    await user.click(screen.getByText("Show More"));
    expect(onToggleExpansion).toHaveBeenCalledWith("1");

    rerender(
      <PostCard
        post={{ ...basePost, text: longText }}
        wise="categorywise"
        expandedPosts={{ "1": true }}
        onToggleExpansion={onToggleExpansion}
      />
    );
    expect(screen.getByText(longText)).toBeInTheDocument();
    expect(screen.getByText("Show Less")).toBeInTheDocument();
  });

  it("does not render a bookmark button when onToggleBookmark is not provided", () => {
    render(
      <PostCard
        post={basePost}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
      />
    );
    expect(
      screen.queryByRole("button", { name: /bookmark/i })
    ).not.toBeInTheDocument();
  });

  it("calls onToggleBookmark and reflects the bookmarked state", async () => {
    const user = userEvent.setup();
    const onToggleBookmark = jest.fn();
    render(
      <PostCard
        post={basePost}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
        isBookmarked={true}
        onToggleBookmark={onToggleBookmark}
      />
    );
    const btn = screen.getByRole("button", { name: "Remove bookmark" });
    await user.click(btn);
    expect(onToggleBookmark).toHaveBeenCalledWith(basePost);
  });

  it("opens the post in a new tab on desktop click without logging when no token", async () => {
    const user = userEvent.setup();
    render(
      <PostCard
        post={basePost}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
      />
    );
    await user.click(screen.getByText("View Post"));
    expect(window.open).toHaveBeenCalledWith(
      "https://twitter.com/i/web/status/1",
      "_blank"
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("logs the link click via apiClient when a token is present", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "tok123");
    render(
      <PostCard
        post={basePost}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
      />
    );
    await user.click(screen.getByText("View Post"));
    expect(apiClient.post).toHaveBeenCalledWith("/logLinkClick", {
      link: "https://twitter.com/i/web/status/1",
      page: "/dashboard",
    });
  });

  it("does not open a new tab on mobile user agents (uses deep link instead)", async () => {
    const user = userEvent.setup();
    setUserAgent("Mozilla/5.0 (Linux; Android 10)");
    render(
      <PostCard
        post={basePost}
        wise="categorywise"
        expandedPosts={{}}
        onToggleExpansion={jest.fn()}
      />
    );
    await user.click(screen.getByText("View Post"));
    expect(window.open).not.toHaveBeenCalled();
  });
});
