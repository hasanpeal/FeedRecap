import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import apiClient from "@/utils/axios";
import AdminDashboard from "../page";
import { EmailProvider } from "@/context/UserContext";

jest.mock("@/utils/axios");
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

const pushMock = jest.fn();
const routerMock = { push: pushMock };
jest.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// recharts needs a non-zero layout size to render its children; jsdom
// reports 0x0 for everything, so ResponsiveContainer renders nothing by
// default. Mocking it out keeps these tests focused on the page's own data
// loading/auth-guard logic rather than recharts' internals.
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  };
});

function renderAdmin() {
  return render(
    <EmailProvider>
      <AdminDashboard />
    </EmailProvider>
  );
}

const analyticsOk = { data: { code: 0, data: {} } };
// /admin/audit-logs and /admin/users always resolve to `data.logs`/`data.users`
// arrays in the real page (see app/admin/page.tsx), so any test that doesn't
// explicitly override them still needs an empty-array shape here, not the
// bare `{}` from `analyticsOk` — otherwise `.map` on `undefined` throws.
const auditLogsEmpty = { data: { code: 0, data: { logs: [] } } };
const usersEmpty = {
  data: {
    code: 0,
    data: {
      users: [],
      stats: { total: 0, categorywise: 0, customProfiles: 0, withTwitter: 0 },
    },
  },
};

function mockNonAdminAwareGets(overrides: Record<string, any> = {}) {
  mockedApiClient.get.mockImplementation((url: string, config?: any) => {
    for (const key of Object.keys(overrides)) {
      if (url.includes(key)) return overrides[key];
    }
    if (url.includes("/admin/audit-logs")) return Promise.resolve(auditLogsEmpty);
    if (url.includes("/admin/users")) return Promise.resolve(usersEmpty);
    return Promise.resolve(analyticsOk);
  });
}

describe("AdminDashboard page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("redirects to /signin when there is no token", async () => {
    renderAdmin();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    expect(mockedApiClient.get).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard when the user is not an admin", async () => {
    window.localStorage.setItem("token", "user-token");
    mockedApiClient.get.mockResolvedValue({
      data: { code: 0, isAdmin: false },
    });

    renderAdmin();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects to /signin when the admin check request fails", async () => {
    window.localStorage.setItem("token", "user-token");
    mockedApiClient.get.mockRejectedValue(new Error("network error"));

    renderAdmin();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
  });

  it("loads and renders the dashboard for an admin user", async () => {
    window.localStorage.setItem("token", "admin-token");
    mockNonAdminAwareGets({
      "/getUserDetails": Promise.resolve({
        data: { code: 0, isAdmin: true },
      }),
      "/admin/analytics/pageviews": Promise.resolve({
        data: {
          code: 0,
          data: {
            totalViews: 42,
            grouped: { "2026-09-10": { "/dashboard": 5, "/signin": 3 } },
          },
        },
      }),
      "/admin/analytics/linkclicks": Promise.resolve({
        data: {
          code: 0,
          data: {
            totalClicks: 7,
            linkStats: { "https://x.com/a": 5, "https://x.com/b": 2 },
            clicks: [
              {
                metadata: { link: "https://x.com/a" },
                email: "user@example.com",
                createdAt: "2026-09-10T12:00:00.000Z",
              },
            ],
          },
        },
      }),
      "/admin/analytics/activities": Promise.resolve({
        data: {
          code: 0,
          data: {
            totalActivities: 9,
            activityStats: { PAGE_VISIT: 6, LOGIN: 3 },
          },
        },
      }),
      "/admin/audit-logs": Promise.resolve({
        data: {
          code: 0,
          data: {
            logs: [
              {
                _id: "log1",
                email: "user@example.com",
                activityType: "LOGIN",
                activityDescription: "User logged in",
                page: "/signin",
                createdAt: "2026-09-10T12:00:00.000Z",
              },
            ],
          },
        },
      }),
      "/admin/users": Promise.resolve({
        data: {
          code: 0,
          data: {
            users: [
              {
                _id: "u1",
                email: "user@example.com",
                wise: "categorywise",
                categories: [],
                profiles: [],
                twitterUsername: "jack",
              },
            ],
            stats: {
              total: 1,
              categorywise: 1,
              customProfiles: 0,
              withTwitter: 1,
            },
          },
        },
      }),
    });

    renderAdmin();

    await waitFor(() =>
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    );
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getAllByText("user@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("User logged in")).toBeInTheDocument();
    expect(screen.getByText("jack")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows empty states when there is no link-click or analytics data", async () => {
    window.localStorage.setItem("token", "admin-token");
    mockNonAdminAwareGets({
      "/getUserDetails": Promise.resolve({
        data: { code: 0, isAdmin: true },
      }),
    });

    renderAdmin();

    await waitFor(() =>
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    );
    expect(screen.getByText("No link clicks found")).toBeInTheDocument();
    // Total Page Views / Clicks / Activities / Users all default to 0
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("reloads audit logs and analytics when the period/user/activity filters change", async () => {
    window.localStorage.setItem("token", "admin-token");
    mockNonAdminAwareGets({
      "/getUserDetails": Promise.resolve({
        data: { code: 0, isAdmin: true },
      }),
      "/admin/users": Promise.resolve({
        data: {
          code: 0,
          data: {
            users: [
              {
                _id: "u1",
                email: "filtered@example.com",
                wise: "categorywise",
                categories: [],
                profiles: [],
              },
            ],
            stats: { total: 1, categorywise: 1, customProfiles: 0, withTwitter: 0 },
          },
        },
      }),
    });

    renderAdmin();
    await waitFor(() =>
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    );

    const callCountBefore = mockedApiClient.get.mock.calls.length;

    const user = userEvent.setup();
    const periodSelect = screen.getByDisplayValue("Last 7 Days");
    await user.selectOptions(periodSelect, "30d");

    await waitFor(() =>
      expect(mockedApiClient.get.mock.calls.length).toBeGreaterThan(
        callCountBefore
      )
    );
    expect(
      mockedApiClient.get.mock.calls.some(([url]) =>
        String(url).includes("period=30d")
      )
    ).toBe(true);

    const userSelect = screen.getByDisplayValue("All Users");
    const beforeUserFilterCalls = mockedApiClient.get.mock.calls.length;
    await user.selectOptions(userSelect, "filtered@example.com");

    await waitFor(() =>
      expect(mockedApiClient.get.mock.calls.length).toBeGreaterThan(
        beforeUserFilterCalls
      )
    );
    expect(
      mockedApiClient.get.mock.calls.some(
        ([, config]) => config?.params?.userEmail === "filtered@example.com"
      )
    ).toBe(true);
  });
});
