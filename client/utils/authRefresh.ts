import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _refreshRetried?: boolean };

let refreshPromise: Promise<string> | null = null;

function serverUrl(url?: string): boolean {
  const base = process.env.NEXT_PUBLIC_SERVER;
  return Boolean(base && url?.startsWith(base));
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${process.env.NEXT_PUBLIC_SERVER}/refresh`,
        {},
        { withCredentials: true, headers: { "X-Requested-With": "XMLHttpRequest" } }
      )
      .then((response) => {
        const token = response.data?.token;
        if (!token) throw new Error("Refresh response did not contain an access token");
        localStorage.setItem("token", token);
        return token as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axios.interceptors.request.use((config) => {
  if (serverUrl(config.url)) {
    config.withCredentials = true;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (
      error.response?.status === 401 &&
      config &&
      !config._refreshRetried &&
      accessToken &&
      serverUrl(config.url) &&
      !config.url?.endsWith("/refresh") &&
      !config.url?.endsWith("/login")
    ) {
      config._refreshRetried = true;
      try {
        const token = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return axios(config);
      } catch {
        localStorage.removeItem("token");
      }
    }

    return Promise.reject(error);
  }
);
