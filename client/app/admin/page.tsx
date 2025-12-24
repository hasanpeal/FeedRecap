"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEmail } from "@/context/UserContext";
import apiClient from "@/utils/axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
];

interface AuditLog {
  _id: string;
  email?: string;
  activityType: string;
  activityDescription: string;
  page?: string;
  metadata?: any;
  createdAt: string;
}

interface User {
  _id: string;
  email: string;
  wise: string;
  categories: string[];
  profiles: string[];
  twitterUsername?: string;
  isAdmin?: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { emailContext } = useEmail();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedActivity, setSelectedActivity] = useState<string>("all");

  // Data states
  const [pageViewsData, setPageViewsData] = useState<any>(null);
  const [linkClicksData, setLinkClicksData] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/signin");
          return;
        }

        // Check if user is admin from user details
        const userDetailsResponse = await apiClient.get("/getUserDetails");
        if (
          userDetailsResponse.data.code === 0 &&
          userDetailsResponse.data.isAdmin
        ) {
          setIsAdmin(true);
          await loadAllData();
        } else {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadPageViews(),
        loadLinkClicks(),
        loadActivityStats(),
        loadAuditLogs(),
        loadUsers(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const loadPageViews = async () => {
    try {
      const response = await apiClient.get(
        `/admin/analytics/pageviews?period=${selectedPeriod}${
          selectedPage !== "all" ? `&page=${selectedPage}` : ""
        }`
      );
      if (response.data.code === 0) {
        setPageViewsData(response.data.data);
      }
    } catch (error) {
      console.error("Error loading page views:", error);
    }
  };

  const loadLinkClicks = async () => {
    try {
      const response = await apiClient.get(
        `/admin/analytics/linkclicks?period=${selectedPeriod}`
      );
      if (response.data.code === 0) {
        setLinkClicksData(response.data.data);
      }
    } catch (error) {
      console.error("Error loading link clicks:", error);
    }
  };

  const loadActivityStats = async () => {
    try {
      const response = await apiClient.get(
        `/admin/analytics/activities?period=${selectedPeriod}`
      );
      if (response.data.code === 0) {
        setActivityStats(response.data.data);
      }
    } catch (error) {
      console.error("Error loading activity stats:", error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const params: any = { limit: 100 };
      if (selectedUser !== "all") {
        params.userEmail = selectedUser;
      }
      if (selectedActivity !== "all") {
        params.activityType = selectedActivity;
      }

      const response = await apiClient.get("/admin/audit-logs", { params });
      if (response.data.code === 0) {
        setAuditLogs(response.data.data.logs);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get("/admin/users");
      if (response.data.code === 0) {
        setUsers(response.data.data.users);
        setUserStats(response.data.data.stats);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadPageViews();
      loadLinkClicks();
      loadActivityStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedPage, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, selectedActivity, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Prepare chart data
  const pageViewsChartData = pageViewsData?.grouped
    ? Object.entries(pageViewsData.grouped).map(
        ([date, pages]: [string, any]) => {
          const total = Object.values(pages).reduce(
            (a: any, b: any) => a + b,
            0
          );
          return {
            date,
            total,
            ...pages,
          };
        }
      )
    : [];

  const activityChartData = activityStats?.activityStats
    ? Object.entries(activityStats.activityStats).map(([type, count]) => ({
        name: type.replace(/_/g, " "),
        value: count,
      }))
    : [];

  const linkClicksChartData = linkClicksData?.linkStats
    ? Object.entries(linkClicksData.linkStats)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([link, count]) => ({
          link: link.length > 50 ? link.substring(0, 50) + "..." : link,
          count,
        }))
    : [];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">
            Analytics and user activity monitoring
          </p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="3d">Last 3 Days</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>

          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
          >
            <option value="all">All Pages</option>
            <option value="/dashboard">Dashboard</option>
            <option value="/signin">Sign In</option>
            <option value="/signup">Sign Up</option>
            <option value="/">Home</option>
            <option value="/aboutus">About Us</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Page Views</div>
            <div className="text-3xl font-bold">
              {pageViewsData?.totalViews || 0}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Link Clicks</div>
            <div className="text-3xl font-bold">
              {linkClicksData?.totalClicks || 0}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Activities</div>
            <div className="text-3xl font-bold">
              {activityStats?.totalActivities || 0}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Total Users</div>
            <div className="text-3xl font-bold">{userStats?.total || 0}</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Page Views Chart */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Page Views Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pageViewsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Total Views"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Types Pie Chart */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Activity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Links Clicked */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Links Clicked</h2>
            <div className="max-h-96 overflow-y-auto">
              {linkClicksData?.clicks && linkClicksData.clicks.length > 0 ? (
                <div className="space-y-2">
                  {linkClicksData.clicks.map((click: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-700 rounded border border-gray-600 hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <a
                          href={click.metadata?.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7FFFD4] hover:underline break-all text-sm"
                        >
                          {click.metadata?.link || "Unknown link"}
                        </a>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {click.email || "Unknown"} •{" "}
                        {new Date(click.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No link clicks found
                </div>
              )}
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4">User Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Category-wise Users</span>
                <span className="text-2xl font-bold">
                  {userStats?.categorywise || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Custom Profile Users</span>
                <span className="text-2xl font-bold">
                  {userStats?.customProfiles || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Users with Twitter</span>
                <span className="text-2xl font-bold">
                  {userStats?.withTwitter || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activities Section */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Live Activities</h2>
            <div className="flex gap-4">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user._id} value={user.email}>
                    {user.email}
                  </option>
                ))}
              </select>
              <select
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
              >
                <option value="all">All Activities</option>
                <option value="PAGE_VISIT">Page Visits</option>
                <option value="LOGIN">Logins</option>
                <option value="LOGOUT">Logouts</option>
                <option value="LINK_CLICKED">Link Clicks</option>
                <option value="ACCOUNT_CREATED">Account Created</option>
                <option value="PASSWORD_CHANGED">Password Changed</option>
                <option value="TWITTER_ACCOUNT_LINKED">Twitter Linked</option>
                <option value="FEEDBACK_SENT">Feedback Sent</option>
              </select>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Activity</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Page</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-gray-700 hover:bg-gray-700"
                  >
                    <td className="p-2 text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">{log.email || "Unknown"}</td>
                    <td className="p-2">
                      <span className="bg-blue-900 px-2 py-1 rounded text-xs">
                        {log.activityType}
                      </span>
                    </td>
                    <td className="p-2">{log.activityDescription}</td>
                    <td className="p-2 text-gray-400">{log.page || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">All Users</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Feed Type</th>
                  <th className="text-left p-2">Twitter</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-gray-700 hover:bg-gray-700"
                  >
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">
                      <span className="bg-purple-900 px-2 py-1 rounded text-xs">
                        {user.wise}
                      </span>
                    </td>
                    <td className="p-2">
                      {user.twitterUsername || (
                        <span className="text-gray-500">Not linked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
