import axios from "axios";

// Create axios instance with JWT interceptor
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER,
});

// Request interceptor to add JWT token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      // Only redirect if not already on signin/signup pages and not during login
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/signin") &&
        !window.location.pathname.includes("/signup") &&
        !error.config?.url?.includes("/login")
      ) {
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
