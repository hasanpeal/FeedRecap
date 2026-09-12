import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Home from "../page";
import { EmailProvider } from "@/context/UserContext";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const pushMock = jest.fn();
// A real Next.js router instance is referentially stable across renders;
// returning a fresh object literal from useRouter() here would break any
// effect with `router` in its dependency array (it'd re-fire every render).
const routerMock = { push: pushMock };
jest.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

function renderHome() {
  return render(
    <EmailProvider>
      <Home />
    </EmailProvider>
  );
}

describe("Home page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders the hero content when there is no saved token", async () => {
    renderHome();
    expect(
      screen.getByText("Never Miss What Matters on X")
    ).toBeInTheDocument();
    await waitFor(() => expect(mockedAxios.get).not.toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard for a valid, existing-user session token", async () => {
    window.localStorage.setItem("token", "valid-token");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({
          data: { isAuthenticated: true, email: "user@example.com" },
        });
      }
      if (url.includes("/getIsNewUser")) {
        return Promise.resolve({ status: 200, data: { isNewUser: false } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderHome();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects to /newuser for a new user's session token", async () => {
    window.localStorage.setItem("token", "valid-token");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({
          data: { isAuthenticated: true, email: "user@example.com" },
        });
      }
      if (url.includes("/getIsNewUser")) {
        return Promise.resolve({ status: 200, data: { isNewUser: true } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderHome();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/newuser"));
  });

  it("clears an invalid token instead of redirecting", async () => {
    window.localStorage.setItem("token", "bad-token");
    mockedAxios.get.mockResolvedValue({ data: { isAuthenticated: false } });

    renderHome();

    await waitFor(() =>
      expect(window.localStorage.getItem("token")).toBeNull()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("clears the token when the session check throws", async () => {
    window.localStorage.setItem("token", "bad-token");
    mockedAxios.get.mockRejectedValue(new Error("network error"));

    renderHome();

    await waitFor(() =>
      expect(window.localStorage.getItem("token")).toBeNull()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
