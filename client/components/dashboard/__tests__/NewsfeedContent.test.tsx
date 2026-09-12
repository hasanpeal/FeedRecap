import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewsfeedContent } from "../NewsfeedContent";
import { Post } from "../types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

jest.mock("@/utils/axios", () => ({
  __esModule: true,
  default: { post: jest.fn().mockResolvedValue({ data: {} }) },
}));

function makePost(id: string): Post {
  return {
    username: `user${id}`,
    time: "2026-09-01T00:00:00.000Z",
    likes: 1,
    category: "Tech",
    text: `post ${id}`,
    tweet_id: id,
  };
}

function baseProps(overrides: Partial<Parameters<typeof NewsfeedContent>[0]> = {}) {
  return {
    posts: [],
    loadingPosts: false,
    trendingPosts: [],
    loadingTrending: false,
    wise: "categorywise" as const,
    categories: ["Tech"],
    profiles: [],
    selectedCategory: null,
    selectedProfile: null,
    sortBy: "time" as const,
    sortOrder: "desc" as const,
    expandedPosts: {},
    onCategorySelect: jest.fn(),
    onProfileSelect: jest.fn(),
    onSortByChange: jest.fn(),
    onSortOrderChange: jest.fn(),
    onToggleExpansion: jest.fn(),
    profilesContainerRef: createRef<HTMLDivElement>(),
    scrollProfiles: jest.fn(),
    ...overrides,
  };
}

describe("NewsfeedContent", () => {
  const originalMatchMedia = window.matchMedia;

  beforeAll(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("shows 6 skeleton cards (with no real post content) while loading", () => {
    const { container } = render(
      <NewsfeedContent {...baseProps({ loadingPosts: true })} />
    );
    expect(container.querySelectorAll(".post-card")).toHaveLength(6);
    expect(screen.queryByText("View Post")).not.toBeInTheDocument();
  });

  it("shows skeleton cards (not an empty-state message) when posts is empty, even if not explicitly loading", () => {
    // isEmpty (filteredPosts.length === 0) always implies isLoading in this
    // component, since filteredPosts === posts — so the "No posts found."
    // branch is unreachable while posts=[]; an empty `posts` array renders
    // skeletons instead.
    render(<NewsfeedContent {...baseProps()} />);
    expect(screen.queryByText("No posts found.")).not.toBeInTheDocument();
  });

  it("renders posts distributed across columns", () => {
    const posts = [makePost("1"), makePost("2"), makePost("3")];
    render(<NewsfeedContent {...baseProps({ posts })} />);
    expect(screen.getByText("post 1")).toBeInTheDocument();
    expect(screen.getByText("post 2")).toBeInTheDocument();
    expect(screen.getByText("post 3")).toBeInTheDocument();
  });

  it("recomputes the column count on window resize (mobile/tablet/desktop breakpoints)", () => {
    const posts = [makePost("1"), makePost("2")];
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });
    render(<NewsfeedContent {...baseProps({ posts })} />);
    expect(screen.getByText("post 1")).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 800,
    });
    window.dispatchEvent(new Event("resize"));
    expect(screen.getByText("post 1")).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
    window.dispatchEvent(new Event("resize"));
    expect(screen.getByText("post 1")).toBeInTheDocument();
  });

  it("does not render the Show More button when hasMorePosts is falsy", () => {
    render(<NewsfeedContent {...baseProps({ posts: [makePost("1")] })} />);
    expect(screen.queryByText("Show More")).not.toBeInTheDocument();
  });

  it("renders and triggers the Show More button when there are more posts", async () => {
    const user = userEvent.setup();
    const onLoadMore = jest.fn();
    render(
      <NewsfeedContent
        {...baseProps({
          posts: [makePost("1")],
          hasMorePosts: true,
          onLoadMore,
        })}
      />
    );
    const btn = screen.getByRole("button", { name: "Show More" });
    await user.click(btn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("disables the Show More button and shows a loading indicator while loadingMorePosts", () => {
    render(
      <NewsfeedContent
        {...baseProps({
          posts: [makePost("1")],
          hasMorePosts: true,
          loadingMorePosts: true,
        })}
      />
    );
    const buttons = screen.getAllByRole("button");
    const loadMoreBtn = buttons.find((b) =>
      b.className.includes("min-w-[8.5rem]")
    ) as HTMLButtonElement;
    expect(loadMoreBtn).toBeDisabled();
  });

  it("passes bookmark state down to PostCard", () => {
    const post = makePost("1");
    render(
      <NewsfeedContent
        {...baseProps({
          posts: [post],
          bookmarkedTweetIds: new Set(["1"]),
          onToggleBookmark: jest.fn(),
        })}
      />
    );
    expect(
      screen.getByRole("button", { name: "Remove bookmark" })
    ).toBeInTheDocument();
  });
});
