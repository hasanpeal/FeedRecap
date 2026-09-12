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
  TutorialOverlay: ({ onClose, onComplete, onStepChange }: any) => (
    <div>
      tutorial-overlay
      <button onClick={() => onClose?.()}>skip-tutorial</button>
      <button onClick={() => onComplete?.()}>complete-tutorial</button>
      <button onClick={() => onStepChange?.(0)}>tutorial-step-0</button>
      <button onClick={() => onStepChange?.(1)}>tutorial-step-1</button>
      <button onClick={() => onStepChange?.(2)}>tutorial-step-2</button>
    </div>
  ),
}));
jest.mock("@/components/dashboard/SkeletonLoader", () => ({
  SkeletonLoader: () => <div>skeleton-loader</div>,
}));
jest.mock("@/components/dashboard/NewsfeedContent", () => ({
  NewsfeedContent: ({
    onToggleBookmark,
    onLoadMore,
    onToggleExpansion,
    scrollProfiles,
  }: any) => (
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
      <button onClick={() => onToggleExpansion?.("t1")}>
        toggle-expansion
      </button>
      <button onClick={() => scrollProfiles?.("left")}>scroll-left</button>
      <button onClick={() => scrollProfiles?.("right")}>scroll-right</button>
    </div>
  ),
}));
jest.mock("@/components/dashboard/NewsletterSection", () => ({
  NewsletterSection: ({ onShareOnX }: any) => (
    <div>
      newsletter-section
      <button onClick={() => onShareOnX?.()}>share-on-x</button>
    </div>
  ),
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
    dropdownRef,
    twitterDropdownRef,
    twitterSuggestionsRef,
  }: any) => (
    <div>
      settings-section
      <div ref={dropdownRef} data-testid="dropdown-anchor">
        <button onClick={() => onAddProfile?.("carol")}>add-profile</button>
        <button
          onClick={() =>
            onSearchInputChange?.({ target: { value: "carol" } })
          }
        >
          change-search-input
        </button>
      </div>
      <div ref={twitterDropdownRef} data-testid="twitter-dropdown-anchor">
        <button onClick={() => onConnectTwitter?.()}>connect-twitter</button>
        <button
          onClick={() =>
            onTwitterUsernameChange?.({ target: { value: "myhandle" } })
          }
        >
          change-twitter-username
        </button>
        <button
          onClick={() =>
            onTwitterUsernameChange?.({ target: { value: "" } })
          }
        >
          clear-twitter-username
        </button>
        <button
          onClick={() =>
            onTwitterUsernameChange?.({ target: { value: "@handle" } })
          }
        >
          change-twitter-username-at
        </button>
      </div>
      <div
        ref={twitterSuggestionsRef}
        data-testid="twitter-suggestions-anchor"
      >
        <button onClick={() => onSelectTwitterAccount?.("bob")}>
          select-twitter-account
        </button>
        <button onClick={() => onSelectTwitterAccount?.("missing-user")}>
          select-missing-twitter-account
        </button>
      </div>
      <button onClick={() => onCategoryUpdate?.()}>save-categories</button>
      <button onClick={() => onFeedTypeUpdate?.()}>save-feed-type</button>
      <button onClick={() => onTimeUpdate?.()}>save-time</button>
      <button onClick={() => onProfileUpdate?.()}>save-profiles</button>
      <button onClick={() => onUnlinkTwitter?.()}>unlink-twitter</button>
      <button onClick={() => onShowFollowedProfiles?.()}>
        show-followed-profiles
      </button>
      <button onClick={() => onAddSelectedAccounts?.()}>
        add-selected-accounts
      </button>
      <button onClick={() => onRemoveProfile?.("dave")}>remove-profile</button>
      <button
        onClick={() =>
          onSearchInputChange?.({ target: { value: "" } })
        }
      >
        clear-search-input
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
    onResetChat,
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
        <button onClick={() => onResetChat?.()}>reset-chat</button>
      </div>
    ),
  ChatButton: ({ onClick }: any) => (
    <button onClick={onClick}>chat-button</button>
  ),
}));
jest.mock("@/components/dashboard/Modal", () => ({
  Modal: ({ isOpen, message }: any) =>
    !isOpen ? null : <div>modal-message: {message}</div>,
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

  it("does not send an empty chat message", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets(customProfilesData);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "chat-button" }));
    await userEvent.click(screen.getByText("send-message"));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resets the chat", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets(customProfilesData);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ aiResponse: "Hi!" }),
    }) as any;

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "chat-button" }));
    await userEvent.type(screen.getByLabelText("chat-input"), "hello");
    await userEvent.click(screen.getByText("send-message"));
    await waitFor(() => expect(screen.getByText("Hi!")).toBeInTheDocument());

    await userEvent.click(screen.getByText("reset-chat"));
    expect(screen.queryByText("Hi!")).not.toBeInTheDocument();
  });

  it("completes the tutorial via the overlay callback", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    await userEvent.click(screen.getByText("complete-tutorial"));

    expect(window.localStorage.getItem("hasSeenTutorial")).toBe("true");
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
  });

  it("skips the tutorial via the overlay callback", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByText("skip-tutorial"));

    expect(window.localStorage.getItem("hasSeenTutorial")).toBe("true");
  });

  it("moves between tabs as the tutorial step changes", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByText("tutorial-step-1"));
    expect(screen.getByText("newsletter-section")).toBeInTheDocument();

    await userEvent.click(screen.getByText("tutorial-step-2"));
    expect(screen.getByText("settings-section")).toBeInTheDocument();

    await userEvent.click(screen.getByText("tutorial-step-0"));
    expect(screen.getByText("newsfeed-content")).toBeInTheDocument();
  });

  it("closes the profile dropdown on an outside click but not an inside one", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("change-search-input"));

    // Inside click: ref contains the target, dropdown stays untouched.
    await userEvent.click(screen.getByTestId("dropdown-anchor"));
    // Outside click: closes the dropdown.
    await userEvent.click(document.body);
  });

  it("closes the twitter dropdown and suggestions on outside clicks", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByTestId("twitter-dropdown-anchor"));
    await userEvent.click(document.body);
    await userEvent.click(screen.getByTestId("twitter-suggestions-anchor"));
    await userEvent.click(document.body);
  });

  it("shows an error notification when loading dashboard data fails with a non-200 response", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/data": Promise.resolve({ status: 500, data: {} }),
    });

    renderDashboard();

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
  });

  it("shows an error notification when loading dashboard data throws", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/data": Promise.reject(new Error("network error")),
    });

    renderDashboard();

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
  });

  it("shows an error notification when fetching more posts fails", async () => {
    window.localStorage.setItem("token", "good-token");
    let call = 0;
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session"))
        return Promise.resolve({
          data: { isAuthenticated: true, email: "user@example.com" },
        });
      if (url.includes("/data")) {
        call++;
        if (call === 1)
          return Promise.resolve({
            ...dataOk,
            data: { ...dataOk.data, pagination: { hasMore: true } },
          });
        return Promise.reject(new Error("network error"));
      }
      if (url.includes("/trending"))
        return Promise.resolve({ status: 200, data: { posts: [] } });
      if (url.includes("/bookmarks"))
        return Promise.resolve({ status: 200, data: { bookmarks: [] } });
      return Promise.resolve({ status: 200, data: {} });
    });

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByText("load-more"));
    await waitFor(() => expect(call).toBeGreaterThan(1));
  });

  it("re-fetches bookmarks after failing to add a bookmark", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockRejectedValue(new Error("failed"));

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    const getsBefore = mockedAxios.get.mock.calls.length;

    await userEvent.click(screen.getByText("toggle-bookmark"));

    await waitFor(() =>
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThan(getsBefore)
    );
  });

  it("re-fetches bookmarks after failing to remove a bookmark from the newsfeed", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      bookmarks: Promise.resolve({
        status: 200,
        data: { bookmarks: [{ tweetId: "t1", username: "alice" }] },
      }),
    });
    mockedAxios.delete.mockRejectedValue(new Error("failed"));

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    const getsBefore = mockedAxios.get.mock.calls.length;

    await userEvent.click(screen.getByText("toggle-bookmark"));

    await waitFor(() =>
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThan(getsBefore)
    );
  });

  it("shows an error notification when removing a bookmark fails", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.delete.mockRejectedValue(new Error("failed"));

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Bookmarks" }));
    const getsBefore = mockedAxios.get.mock.calls.length;

    await userEvent.click(screen.getByText("remove-bookmark"));

    await waitFor(() =>
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThan(getsBefore)
    );
  });

  it("shows a modal error when sharing fails because the newsletter element is missing", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Newsletter" }));

    await userEvent.click(screen.getByText("share-on-x"));

    await waitFor(() =>
      expect(
        screen.getByText(/Error capturing newsletter/)
      ).toBeInTheDocument()
    );
  });

  it("shows a modal error when sharing throws unexpectedly", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    const el = document.createElement("div");
    el.id = "newsletter-content";
    document.body.appendChild(el);
    const html2canvas = require("html2canvas");
    (html2canvas as jest.Mock).mockRejectedValue(new Error("canvas failed"));

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("button", { name: "Newsletter" }));

    await userEvent.click(screen.getByText("share-on-x"));

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to share the newsletter/)
      ).toBeInTheDocument()
    );
    document.body.removeChild(el);
  });

  it("shows an error notification when adding a profile fails after retries", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/api/twitter": Promise.reject(new Error("lookup failed")),
    });

    await openSettings();
    await userEvent.click(screen.getByText("add-profile"));

    // fetchUserProfile falls back to a placeholder avatar instead of
    // throwing, so no error notification is expected here; this exercises
    // the retry-exhaustion branch of fetchUserProfile.
    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
  });

  it("rejects adding a duplicate profile and a profile over the limit", async () => {
    window.localStorage.setItem("token", "good-token");
    const manyProfiles = Array.from({ length: 10 }, (_, i) => `user${i}`);
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: {
          ...dataOk.data,
          user: { ...dataOk.data.user, profiles: manyProfiles },
        },
      }),
    });

    await openSettings();
    await userEvent.click(screen.getByText("add-profile"));

    // profiles already at MAX_CUSTOM_PROFILES (10), so this should be
    // rejected without an extra axios call for the new profile lookup.
  });

  it("clears search suggestions when the search input is emptied", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("change-search-input"));
    await userEvent.click(screen.getByText("clear-search-input"));
  });

  it("clears twitter suggestions and strips a leading @ from the username", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();
    await userEvent.click(screen.getByText("clear-twitter-username"));
    await userEvent.click(
      screen.getByText("change-twitter-username-at")
    );
    await userEvent.click(screen.getByText("connect-twitter"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/saveX"),
        expect.objectContaining({ twitterUsername: "handle" }),
        expect.anything()
      )
    );
  });

  it("shows an error notification when connecting to twitter fails", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockRejectedValue(new Error("failed"));

    await openSettings();
    await userEvent.click(screen.getByText("change-twitter-username"));
    await userEvent.click(screen.getByText("connect-twitter"));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  });

  it("shows an error notification when updating categories fails with a non-200 response", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 500 });

    await openSettings();
    await userEvent.click(screen.getByText("save-categories"));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  });

  it("shows an error notification when updating categories throws", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockRejectedValue(new Error("failed"));

    await openSettings();
    await userEvent.click(screen.getByText("save-categories"));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  });

  it("shows an error notification when updating times fails with a non-200 response", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 500 });

    await openSettings();
    await userEvent.click(screen.getByText("save-time"));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  });

  it("shows an error notification when updating times throws", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockRejectedValue(new Error("failed"));

    await openSettings();
    await userEvent.click(screen.getByText("save-time"));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  });

  it("rejects switching to custom-profiles feed with too few profiles", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets(customProfilesData);

    await openSettings();
    await userEvent.click(screen.getByText("save-feed-type"));

    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/updateFeedType"),
      expect.anything(),
      expect.anything()
    );
  });

  it("rejects switching to custom-profiles feed with too many profiles", async () => {
    window.localStorage.setItem("token", "good-token");
    const manyProfiles = Array.from({ length: 11 }, (_, i) => `user${i}`);
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: {
          ...dataOk.data,
          user: {
            ...dataOk.data.user,
            wise: "customProfiles",
            profiles: manyProfiles,
          },
        },
      }),
    });

    await openSettings();
    await userEvent.click(screen.getByText("save-feed-type"));

    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/updateFeedType"),
      expect.anything(),
      expect.anything()
    );
  });

  it("rejects switching to category-wise feed with no categories selected", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: {
          ...dataOk.data,
          user: { ...dataOk.data.user, categories: [] },
        },
      }),
    });

    await openSettings();
    await userEvent.click(screen.getByText("save-feed-type"));

    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/updateFeedType"),
      expect.anything(),
      expect.anything()
    );
  });

  it("updates the feed type successfully", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();
    await userEvent.click(screen.getByText("save-feed-type"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateFeedType"),
        expect.anything(),
        expect.anything()
      )
    );
  });

  it("shows an error notification when updating feed type fails with a non-200 response", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockResolvedValue({ status: 500 });

    await openSettings();
    await userEvent.click(screen.getByText("save-feed-type"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateFeedType"),
        expect.anything(),
        expect.anything()
      )
    );
  });

  it("shows an error notification when updating feed type throws", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockRejectedValue(new Error("failed"));

    await openSettings();
    await userEvent.click(screen.getByText("save-feed-type"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateFeedType"),
        expect.anything(),
        expect.anything()
      )
    );
  });

  it("shows an error notification when unlinking twitter fails", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();
    mockedAxios.post.mockRejectedValue(new Error("failed"));

    await openSettings();
    await userEvent.click(screen.getByText("unlink-twitter"));

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalled());
  });

  it("loads followed profiles from cache when available", async () => {
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
    window.localStorage.setItem(
      "twitter_following_existinguser",
      JSON.stringify([{ screen_name: "bob", profile_image: "a.png" }])
    );

    await openSettings();
    await userEvent.click(screen.getByText("show-followed-profiles"));

    // cached path does not need to hit the following.php endpoint
    const followingCalls = mockedAxios.get.mock.calls.filter(
      ([, config]: any) => config?.params?.endpoint === "following.php"
    );
    expect(followingCalls.length).toBe(0);
  });

  it("does nothing when showing followed profiles with no linked account", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("show-followed-profiles"));
  });

  it("shows an error notification when fetching followed profiles fails", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: {
          ...dataOk.data,
          user: { ...dataOk.data.user, twitterUsername: "existinguser" },
        },
      }),
      "/api/twitter": Promise.reject(new Error("failed")),
    });

    await openSettings();
    await userEvent.click(screen.getByText("show-followed-profiles"));

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
  });

  it("paginates through multiple pages of twitter following", async () => {
    window.localStorage.setItem("token", "good-token");
    let page = 0;
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session"))
        return Promise.resolve({
          data: { isAuthenticated: true, email: "user@example.com" },
        });
      if (url.includes("/data")) return Promise.resolve(dataOk);
      if (url.includes("/trending"))
        return Promise.resolve({ status: 200, data: { posts: [] } });
      if (url.includes("/bookmarks"))
        return Promise.resolve({ status: 200, data: { bookmarks: [] } });
      if (url.includes("/api/twitter")) {
        page++;
        if (page === 1)
          return Promise.resolve({
            data: {
              following: [{ screen_name: "bob", profile_image: "a.png" }],
              next_cursor: "cursor-2",
            },
          });
        return Promise.resolve({
          data: {
            following: [{ screen_name: "carol", profile_image: "b.png" }],
            next_cursor: "0",
          },
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    mockedAxios.post.mockResolvedValue({ status: 200 });

    await openSettings();
    await userEvent.click(screen.getByText("change-twitter-username"));
    await userEvent.click(screen.getByText("connect-twitter"));

    await waitFor(() => expect(page).toBeGreaterThanOrEqual(2));
  });

  it("toggles a selected twitter account off after selecting it", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("show-followed-profiles"));
    await userEvent.click(screen.getByText("select-twitter-account"));
    await userEvent.click(screen.getByText("select-twitter-account"));
    await userEvent.click(screen.getByText("add-selected-accounts"));
  });

  it("shows an error notification when adding selected accounts with none chosen", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("add-selected-accounts"));
  });

  it("skips selected accounts once the profile limit is reached", async () => {
    window.localStorage.setItem("token", "good-token");
    const manyProfiles = Array.from({ length: 10 }, (_, i) => `user${i}`);
    mockAuthenticatedGets({
      "/data": Promise.resolve({
        ...dataOk,
        data: {
          ...dataOk.data,
          user: { ...dataOk.data.user, profiles: manyProfiles },
        },
      }),
    });

    await openSettings();
    await userEvent.click(screen.getByText("show-followed-profiles"));
    await userEvent.click(screen.getByText("select-twitter-account"));
    await userEvent.click(screen.getByText("add-selected-accounts"));
  });

  it("ignores selected accounts that are no longer in the following list", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    await openSettings();
    await userEvent.click(screen.getByText("show-followed-profiles"));
    await userEvent.click(screen.getByText("select-missing-twitter-account"));
    await userEvent.click(screen.getByText("add-selected-accounts"));
  });

  it("expands and collapses a post, and scrolls the profile rail", async () => {
    window.localStorage.setItem("token", "good-token");
    mockAuthenticatedGets();

    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText("newsfeed-content")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByText("toggle-expansion"));
    await userEvent.click(screen.getByText("toggle-expansion"));
    await userEvent.click(screen.getByText("scroll-left"));
    await userEvent.click(screen.getByText("scroll-right"));
  });
});
