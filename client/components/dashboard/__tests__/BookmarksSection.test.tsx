import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookmarksSection } from "../BookmarksSection";
import { Bookmark } from "../types";

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

const bookmark: Bookmark = {
  tweetId: "42",
  link: "https://twitter.com/i/web/status/42",
  username: "alice",
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("BookmarksSection", () => {
  const originalOpen = window.open;
  const desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

  beforeEach(() => {
    window.open = jest.fn();
    setUserAgent(desktopUA);
  });

  afterAll(() => {
    window.open = originalOpen;
  });

  it("renders loading skeletons", () => {
    const { container } = render(
      <BookmarksSection
        bookmarks={[]}
        loadingBookmarks={true}
        onRemoveBookmark={jest.fn()}
      />
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(4);
  });

  it("renders an empty state when there are no bookmarks", () => {
    render(
      <BookmarksSection
        bookmarks={[]}
        loadingBookmarks={false}
        onRemoveBookmark={jest.fn()}
      />
    );
    expect(screen.getByText(/No bookmarks yet/)).toBeInTheDocument();
  });

  it("renders a bookmark with username and link", () => {
    render(
      <BookmarksSection
        bookmarks={[bookmark]}
        loadingBookmarks={false}
        onRemoveBookmark={jest.fn()}
      />
    );
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(
      screen.getByText("https://twitter.com/i/web/status/42")
    ).toBeInTheDocument();
  });

  it("omits the username heading when not provided", () => {
    render(
      <BookmarksSection
        bookmarks={[{ ...bookmark, username: undefined }]}
        loadingBookmarks={false}
        onRemoveBookmark={jest.fn()}
      />
    );
    expect(screen.queryByText("@alice")).not.toBeInTheDocument();
  });

  it("calls onRemoveBookmark with the tweetId", async () => {
    const user = userEvent.setup();
    const onRemoveBookmark = jest.fn();
    render(
      <BookmarksSection
        bookmarks={[bookmark]}
        loadingBookmarks={false}
        onRemoveBookmark={onRemoveBookmark}
      />
    );
    await user.click(screen.getByRole("button", { name: "Remove bookmark" }));
    expect(onRemoveBookmark).toHaveBeenCalledWith("42");
  });

  it("opens the post link in a new tab on desktop", async () => {
    const user = userEvent.setup();
    render(
      <BookmarksSection
        bookmarks={[bookmark]}
        loadingBookmarks={false}
        onRemoveBookmark={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Open post" }));
    expect(window.open).toHaveBeenCalledWith(
      "https://twitter.com/i/web/status/42",
      "_blank"
    );
  });

  it("does not call window.open on mobile (uses deep link instead)", async () => {
    const user = userEvent.setup();
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    render(
      <BookmarksSection
        bookmarks={[bookmark]}
        loadingBookmarks={false}
        onRemoveBookmark={jest.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Open post" }));
    expect(window.open).not.toHaveBeenCalled();
  });
});
