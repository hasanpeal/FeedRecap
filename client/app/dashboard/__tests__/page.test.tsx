import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Dashboard from "../page";
import { EmailProvider } from "@/context/UserContext";

// This page is a large orchestrator that composes many dashboard/*
// components. Per the test plan for this page, those children are mocked
// out so these tests exercise the page's own logic (auth guard, data
// loading, tab switching) rather than re-testing children covered
// elsewhere.
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("html2canvas", () => jest.fn());
jest.mock("@/components/dashboard/utils", () => ({
  playSound: jest.fn(),
  isIOS: jest.fn(() => false),
}));

jest.mock("@/components/navbar3", () => {
  const Navbar3Mock = () => <div>navbar3</div>;
  return Navbar3Mock;
});
jest.mock("@/components/tutorial-overlay", () => ({
  TutorialOverlay: () => <div>tutorial-overlay</div>,
}));
jest.mock("@/components/dashboard/SkeletonLoader", () => ({
  SkeletonLoader: () => <div>skeleton-loader</div>,
}));
jest.mock("@/components/dashboard/NewsfeedContent", () => ({
  NewsfeedContent: ({ onToggleBookmark, onLoadMore, posts }: any) => (
    <div>
      newsfeed-content
      <button
        onClick={() =>
          onToggleBookmark?.({ tweet_id: "t1", username: "alice" })
        }
      >
        toggle-bookmark
      </button>
      <button onClick={() => onLoadMore?.()}>load-more</button>
    </div>
  ),
}));
jest.mock("@/components/dashboard/NewsletterSection", () => ({
  NewsletterSection: () => <div>newsletter-section</div>,
}));
jest.mock("@/components/dashboard/SettingsSection", () => ({
  SettingsSection: ({
    onCategoryUpdate,
    onFeedTypeUpdate,
    onTimeUpdate,
    onProfileUpdate,
    onConnectTwitter,
    onUnlinkTwitter,
    onShowFollowedProfiles,
    onSelectTwitterAccount,
    onAddSelectedAccounts,
    onAddProfile,
    onRemoveProfile,
    onSearchInputChange,
    onTwitterUsernameChange,
  }: any) => (
    <div>
      settings-section
      <button onClick={() => onCategoryUpdate?.()}>save-categories</button>
      <button onClick={() => onFeedTypeUpdate?.()}>save-feed-type</button>
      <button onClick={() => onTimeUpdate?.()}>save-time</button>
      <button onClick={() => onProfileUpdate?.()}>save-profiles</button>
      <button onClick={() => onConnectTwitter?.()}>connect-twitter</button>
      <button onClick={() => onUnlinkTwitter?.()}>unlink-twitter</button>
      <button onClick={() => onShowFollowedProfiles?.()}>
        show-followed-profiles
      </button>
      <button onClick={() => onSelectTwitterAccount?.("bob")}>
        select-twitter-account
      </button>
      <button onClick={() => onAddSelectedAccounts?.()}>
        add-selected-accounts
      </button>
      <button onClick={() => onAddProfile?.("carol")}>add-profile</button>
      <button onClick={() => onRemoveProfile?.("dave")}>remove-profile</button>
      <button
        onClick={() =>
          onSearchInputChange?.({ target: { value: "carol" } })
        }
      >
        change-search-input
      </button>
      <button
        onClick={() =>
          onTwitterUsernameChange?.({ target: { value: "myhandle" } })
        }
      >
        change-twitter-username
      </button>
    </div>
  ),
}));
jest.mock("@/components/dashboard/BookmarksSection", () => ({
  BookmarksSection: ({ onRemoveBookmark }: any) => (
    <div>
      bookmarks-section
      <button onClick={() => onRemoveBookmark?.("t1")}>remove-bookmark</button>
    </div>
  ),
}));
jest.mock("@/components/dashboard/ChatModal", () => ({
  ChatModal: ({
    isChatOpen,
    chatMessages,
    userInput,
    onInputChange,
    onSendMessage,
  }: any) =>
    !isChatOpen ? null : (
      <div>
        chat-modal
        {chatMessages?.map((m: any, i: number) => (
          <div key={i}>{m.content}</div>
        ))}
        <input
          aria-label="chat-input"
          value={userInput}
          onChange={(e) => onInputChange?.(e.target.value)}
        />
        <button onClick={() => onSendMessage?.()}>send-message</button>
      </div>
    ),
  ChatButton: ({ onClick }: any) => (
    <button onClick={onClick}>chat-button</button>
  ),
}));
jest.mock("@/components/dashboard/Modal", () => ({
  Modal: () => <div>modal</div>,
}));
jest.mock("@/components/dashboard/Notification", () => ({
  Notification: () => <div>notification</div>,
}));

function renderDashboard() {
  return render(
    <EmailProvider>
      <Dashboard />
    </EmailProvider>
  );
}

const dataOk = {
  status: 200,
  data: {
    user: {
      categories: ["AI"],
      time: ["Morning"],
      timezone: "America/New_York",
      newsletter: "Hello",
      wise: "categorywise",
      twitterUsername: null,
      latestNewsletterId: "n1",
      profiles: [],
    },
    profileAvatars: {},
    posts: [],
    pagination: { hasMore: false },
  },
};

function mockAuthenticatedGets(overrides: Record<string, any> = {}) {
  mockedAxios.get.mockImplementation((url: string) => {
    for (const key of Object.keys(overrides)) {
      if (url.includes(key)) return overrides[key];
    }
    if (url.includes("/check-session")) {
      return Promise.resolve({
        data: { isAuthenticated: true, email: "user@example.com" },
      });
    }
    if (url.includes("/data")) return Promise.resolve(dataOk);
    if (url.includes("/trending"))
      return Promise.resolve({ status: 200, data: { posts: [] } });
    if (url.includes("/bookmarks"))
      return Promise.resolve({ status: 200, data: { bookmarks: [] } });
    return Promise.resolve({ status: 200, data: {} });
  });
}

describe("Dashboard page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("redirects to /signin when there is no token", async () => {
    renderDashboard();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("removes the token and redirects to /signin when the session check says unauthenticated", async () => {
    window.localStorage.setItem("token", "bad-token");
    mockedAxios.get.mockResolvedValue({
      data: { isAuthenticated: false, email: null },
    });

    renderDashboard();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    expect(window.localStorage.getItem("token")).toBeNull();
  });

  it("keeps the token and does not redirect on a non-401 session-check error", async () => {
    window.localStorage.setItem("token", "some-token");
    mockedAxios.get.mockRejectedValue({ response: { status: 500 } });

    renderDashboard();

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalledWith("/signin");
    expect(window.localStorage.getItem("token")).toBe("some-token");
  });

  it("loads the dashboard and shows the newsfeed tab by default for an authenticated user", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    expect(screen.getByText("navbar3")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("switches to the newsletter tab when its nav button is clicked", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "Newsletter" }));

    expect(screen.getByText("newsletter-section")).toBeInTheDocument();
    expect(screen.queryByText("newsfeed-content")).not.toBeInTheDocument();
  });

  it("adds a bookmark via NewsfeedContent's onToggleBookmark callback", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByText("toggle-bookmark"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/bookmarks"),
        expect.objectContaining({ tweetId: "t1", username: "alice" }),
        expect.anything()
      )
    );
  });

  it("triggers a follow-up fetch when NewsfeedContent's onLoadMore fires", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: { ...dataOk.data, pagination: { hasMore: true } },
      }),
    });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    const callsBefore = mockedAxios.get.mock.calls.length;

    await userEvent.click(screen.getByText("load-more"));

    await waitFor(() =>
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });

  it("saves categories via SettingsSection's onCategoryUpdate callback", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));

    await userEvent.click(screen.getByText("save-categories"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateCategories"),
        expect.objectContaining({ categories: expect.any(Array) }),
        expect.anything()
      )
    );
  });

  it("switches to the bookmarks and settings tabs", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "Bookmarks" }));
    expect(screen.getByText("bookmarks-section")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText("settings-section")).toBeInTheDocument();
  });

  async function openSettings() {
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
  }

  it("saves the selected times via onTimeUpdate", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();
    await userEvent.click(screen.getByText("save-time"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateTimes"),
        expect.anything(),
        expect.anything()
      )
    );
  });

  it("connects a Twitter account after typing a username", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();
    await userEvent.click(screen.getByText("change-twitter-username"));
    await userEvent.click(screen.getByText("connect-twitter"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/saveX"),
        expect.objectContaining({ twitterUsername: "myhandle" }),
        expect.anything()
      )
    );
  });

  it("does not call saveX when connecting with no Twitter username entered", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("connect-twitter"));

    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/saveX"),
      expect.anything(),
      expect.anything()
    );
  });

  it("unlinks and shows followed profiles for an already-linked Twitter account", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: {
          ...dataOk.data,
          user: { ...dataOk.data.user, twitterUsername: "existinguser" },
        },
      }),
    });
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();

    await userEvent.click(screen.getByText("show-followed-profiles"));
    await userEvent.click(screen.getByText("select-twitter-account"));
    await userEvent.click(screen.getByText("add-selected-accounts"));

    await userEvent.click(screen.getByText("unlink-twitter"));
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/unlinkX"),
        expect.anything(),
        expect.anything()
      )
    );
  });

  it("adds and removes a custom profile", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("change-search-input"));
    await userEvent.click(screen.getByText("add-profile"));
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());

    await userEvent.click(screen.getByText("remove-profile"));
  });

  it("saves updated profiles via onProfileUpdate", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();
    await userEvent.click(screen.getByText("save-profiles"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateProfiles"),
        expect.anything(),
        expect.anything()
      )
    );
    // onProfileUpdate switches back to the newsfeed tab on success.
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
  });

  it("removes a bookmark from the bookmarks tab", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.delete.mockResolvedValue({ status: 200 });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Bookmarks" }));

    await userEvent.click(screen.getByText("remove-bookmark"));

    await waitFor(() =>
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining("/bookmarks/t1"),
        expect.anything()
      )
    );
  });

  const customProfilesData = {
    "/data": Promise.resolve({
      ...dataOk,
      data: {
        ...dataOk.data,
        user: { ...dataOk.data.user, wise: "customProfiles" },
      },
    }),
  };

  it("sends and receives a chat message", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets(customProfilesData);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ aiResponse: "Hi *there*!" }),
    });
    global.fetch = fetchMock as any;

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "chat-button" }));
    await userEvent.type(screen.getByLabelText("chat-input"), "hello");
    await userEvent.click(screen.getByText("send-message"));

    await waitFor(() =>
      expect(screen.getByText("Hi there!")).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/deepseek",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows a fallback chat message when the chat request fails", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets(customProfilesData);
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as any;

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "chat-button" }));
    await userEvent.type(screen.getByLabelText("chat-input"), "hello");
    await userEvent.click(screen.getByText("send-message"));

    await waitFor(() =>
      expect(
        screen.getByText("Sorry, I couldn't process your request. Please try again.")
      ).toBeInTheDocument()
    );
  });
});
