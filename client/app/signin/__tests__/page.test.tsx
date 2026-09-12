import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Signin from "../page";
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

function renderSignin() {
  return render(
    <EmailProvider>
      <Signin />
    </EmailProvider>
  );
}

describe("Signin page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockedAxios.get.mockImplementation((url: string) => {
      // Default: no existing session, email not registered (used by the
      // "email doesn't exist" validation path unless a test overrides it).
      if (typeof url === "string" && url.includes("/check-session")) {
        return Promise.reject(new Error("no session"));
      }
      if (typeof url === "string" && url.includes("/validateEmail")) {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.reject(new Error("unexpected url"));
    });
  });

  it("renders the sign-in form with no saved session", async () => {
    renderSignin();
    expect(
      screen.getByRole("heading", { name: "Sign In" })
    ).toBeInTheDocument();
    await waitFor(() => expect(pushMock).not.toHaveBeenCalled());
  });

  it("redirects to /dashboard when a valid session token already exists", async () => {
    window.localStorage.setItem("token", "existing-token");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({
          data: { isAuthenticated: true, email: "user@example.com" },
        });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows a validation error when submitting an empty form", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Email is required")).toBeInTheDocument()
    );
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows an invalid-email error for a malformed email", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "not-an-email"
    );
    await user.type(screen.getByPlaceholderText("Enter your password"), "x");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Not a valid email")).toBeInTheDocument()
    );
  });

  it("shows an error for a valid but unregistered email", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "nobody@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Email isn't registered")).toBeInTheDocument()
    );
  });

  it("logs in successfully and redirects to /dashboard", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { code: 0, token: "jwt-token", email: "user@example.com" },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(window.localStorage.getItem("token")).toBe("jwt-token");
  });

  it("shows an error when login returns a non-success code", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { code: 1 },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument()
    );
  });

  it("shows the server error message when login throws", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockRejectedValue({
      response: { status: 401, data: { message: "Bad credentials" } },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Bad credentials")).toBeInTheDocument()
    );
  });

  it("toggles into the forgot-password email flow", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));

    expect(
      screen.getByPlaceholderText("Enter your email")
    ).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("sends an OTP, verifies it correctly, and lets the user set a new password", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "123456" } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );

    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "123456"[i]);
    }

    await user.click(screen.getByText("Verify"));

    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );
  });

  it("shows a wrong-OTP message when verification fails", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "999999" } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );

    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "123456"[i]);
    }

    await user.click(screen.getByText("Verify"));

    await waitFor(() =>
      expect(screen.getByText("Wrong OTP")).toBeInTheDocument()
    );
  });

  it("logs in via a successful Google OAuth callback (code=0 with token)", async () => {
    window.history.pushState({}, "", "/signin?code=0&token=oauth-jwt");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({
          data: { isAuthenticated: true, email: "oauth@example.com" },
        });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(window.localStorage.getItem("token")).toBe("oauth-jwt");

    window.history.pushState({}, "", "/signin");
  });

  it("shows an auth-failed message for a Google OAuth callback error", async () => {
    window.history.pushState(
      {},
      "",
      "/signin?code=1&message=Account%20disabled"
    );

    renderSignin();

    await waitFor(() =>
      expect(screen.getByText("Account disabled")).toBeInTheDocument()
    );

    window.history.pushState({}, "", "/signin");
  });

  it("shows a generic auth-failed message when the OAuth error has no message", async () => {
    window.history.pushState({}, "", "/signin?code=1");

    renderSignin();

    await waitFor(() =>
      expect(screen.getByText("Authentication failed")).toBeInTheDocument()
    );

    window.history.pushState({}, "", "/signin");
  });

  it("edits an OTP digit with backspace", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({ data: { otp: "123456" } });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );

    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    await user.type(otpInputs[0], "5");
    expect((otpInputs[0] as HTMLInputElement).value).toBe("5");
    await user.type(otpInputs[0], "{backspace}");
    expect((otpInputs[0] as HTMLInputElement).value).toBe("");
  });

  it("shows validation errors for a weak/mismatched new password", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "short"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "different123"
    );
    await user.click(screen.getByText("Set Password"));

    await waitFor(() =>
      expect(
        screen.getAllByText(
          "Password must be at least 8 characters long and include a letter and a number"
        ).length
      ).toBeGreaterThan(0)
    );
    expect(screen.getByText("Password doesn't match")).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/resetPassword"),
      expect.anything()
    );
  });

  it("resets the password successfully", async () => {
    // Note: on success the component calls window.location.reload() after a
    // 1s setTimeout. jsdom's window.location.reload is a read-only,
    // non-configurable accessor in this jsdom version (can't be spied), and
    // "Not implemented: navigation" is merely logged rather than thrown, so
    // we don't need to touch it — just assert the success message appears.
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      if (url.includes("/resetPassword")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Set Password"));

    // On success the component stores a "Password reset successful" message
    // in the same `formErrors.password` state used by the initial sign-in
    // view, but that view isn't the one rendered here (we're still on the
    // passFlag/new-password screen, which doesn't display formErrors.password)
    // — the real app relies on window.location.reload() a second later to
    // show it fresh. So we assert on what *is* observable here: the request
    // fired correctly and the success loading spinner (`load2`) renders.
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/resetPassword"),
        { email: "user@example.com", newPassword: "newpassword1" }
      )
    );
    await waitFor(() =>
      expect(document.querySelector(".loading-spinner")).toBeInTheDocument()
    );
  });

  it("shows a generic error when resetting the password throws without a 404 response", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      if (url.includes("/resetPassword")) return Promise.reject(new Error("network error"));
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Set Password"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/resetPassword"),
        expect.anything()
      )
    );
    expect(document.querySelector(".loading-spinner")).not.toBeInTheDocument();
  });

  it("shows a 'user doesn't exist' error when resetting a password for an unknown account", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      if (url.includes("/resetPassword"))
        return Promise.reject({ response: { status: 404 } });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "ghost@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Set Password"));

    // As with the success case, the resulting formErrors.password message
    // ("User doesn't exist") is set on state used by a different (sign-in)
    // view than the one currently rendered (passFlag/new-password), so it
    // isn't visible here — assert on the request outcome instead: no success
    // spinner appears, and the new-password screen is still showing.
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/resetPassword"),
        { email: "ghost@example.com", newPassword: "newpassword1" }
      )
    );
    expect(document.querySelector(".loading-spinner")).not.toBeInTheDocument();
    expect(screen.getByText("New Password")).toBeInTheDocument();
  });

  it("triggers the Google OAuth handler on 'Sign in with Google' without crashing", async () => {
    // jsdom's window.location.href setter is a non-configurable accessor
    // that only logs "Not implemented: navigation" rather than actually
    // navigating or being interceptable/spy-able, so we can't assert the
    // resulting URL here — just that the click handler runs cleanly.
    renderSignin();
    const user = userEvent.setup();
    await user.click(screen.getByText("Sign in with Google"));
    expect(
      screen.getByRole("heading", { name: "Sign In" })
    ).toBeInTheDocument();
  });

  it("removes an invalid saved token instead of redirecting", async () => {
    window.localStorage.setItem("token", "stale-token");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({ data: { isAuthenticated: false } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();

    await waitFor(() =>
      expect(window.localStorage.getItem("token")).toBeNull()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows an error and clears the token on a Google OAuth callback with no resolvable email", async () => {
    window.history.pushState({}, "", "/signin?code=0&token=oauth-jwt");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({ data: { isAuthenticated: false } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();

    await waitFor(() =>
      expect(
        screen.getByText("Invalid authentication token")
      ).toBeInTheDocument()
    );
    expect(pushMock).not.toHaveBeenCalledWith("/dashboard");

    window.history.pushState({}, "", "/signin");
  });

  it("clears the login error message after a delay on invalid credentials", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({ status: 200, data: { code: 1 } });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument()
    );
    await waitFor(
      () =>
        expect(
          screen.queryByText("Invalid email or password")
        ).not.toBeInTheDocument(),
      { timeout: 4000 }
    );
  }, 10000);

  it("clears the login error message after a delay when login throws", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockRejectedValue({
      response: { status: 401, data: { message: "Bad credentials" } },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Bad credentials")).toBeInTheDocument()
    );
    await waitFor(
      () => expect(screen.queryByText("Bad credentials")).not.toBeInTheDocument(),
      { timeout: 4000 }
    );
  }, 10000);

  it("clears validation errors after a delay when the form is invalid", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(screen.getByText("Email is required")).toBeInTheDocument()
    );
    await waitFor(
      () =>
        expect(screen.queryByText("Email is required")).not.toBeInTheDocument(),
      { timeout: 4000 }
    );
  }, 10000);

  it("uses the backend-resolved email after a successful login", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session"))
        return Promise.resolve({
          data: { isAuthenticated: true, email: "backend@example.com" },
        });
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { code: 0, token: "jwt-token", email: "response@example.com" },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("falls back to the response email when the backend session check fails after login", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session"))
        return Promise.reject(new Error("network error"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { code: 0, token: "jwt-token", email: "fallback@example.com" },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("falls back to the typed email when neither the backend nor the response has one", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session"))
        return Promise.reject(new Error("network error"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { code: 0, token: "jwt-token" },
    });

    renderSignin();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows a required-email error when sending an OTP with no email", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(screen.getByText("Email is required")).toBeInTheDocument()
    );
  });

  it("shows an invalid-format error when sending an OTP with a malformed email", async () => {
    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "not-an-email"
    );
    await user.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(screen.getByText("Not a valid email")).toBeInTheDocument()
    );
    await waitFor(
      () => expect(screen.queryByText("Not a valid email")).not.toBeInTheDocument(),
      { timeout: 4000 }
    );
  }, 10000);

  it("shows an unregistered-email error when sending an OTP for an unknown account", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.reject({ response: { status: 404 } });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "nobody@example.com"
    );
    await user.click(screen.getByText("Send"));

    await waitFor(() =>
      expect(screen.getByText("Email isn't registered")).toBeInTheDocument()
    );
  });

  it("shows an error when verifying an incomplete OTP", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({ data: { otp: "123456" } });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );

    await user.click(screen.getByText("Verify"));

    // OTP left incomplete: the digit border switches to the error style.
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    expect(otpInputs[0].className).toContain("border-red-500");
  });

  it("moves focus to the previous OTP digit on backspace when the current one is already empty", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockResolvedValue({ data: { otp: "123456" } });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );

    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    await user.type(otpInputs[1], "5");
    await user.click(otpInputs[1]);
    await user.keyboard("{backspace}"); // clears digit 1
    await user.keyboard("{backspace}"); // digit already empty: focus moves to digit 0

    expect(otpInputs[0]).toHaveFocus();
  });

  it("shows a weak-password error for the confirm-password field specifically", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "goodpassword1"
    );
    await user.type(screen.getByPlaceholderText("Confirm new password"), "short");
    await user.click(screen.getByText("Set Password"));

    await waitFor(() =>
      expect(
        screen.getAllByText(
          "Password must be at least 8 characters long and include a letter and a number"
        ).length
      ).toBeGreaterThan(0)
    );
  });

  it("clears the invalid-new-password errors after a delay", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.click(screen.getByText("Set Password"));
    await waitFor(() =>
      expect(screen.getAllByText("Password is required").length).toBeGreaterThan(0)
    );
    await waitFor(
      () =>
        expect(
          screen.queryByText("Password is required")
        ).not.toBeInTheDocument(),
      { timeout: 4000 }
    );
  }, 10000);

  it("shows a generic error when resetting the password fails for a reason other than 404", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      if (url.includes("/resetPassword")) return Promise.resolve({ status: 500 });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "newpassword1"
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "newpassword1"
    );
    await user.click(screen.getByText("Set Password"));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/resetPassword"),
        expect.anything()
      )
    );
    expect(document.querySelector(".loading-spinner")).not.toBeInTheDocument();
  });

  it("toggles password visibility on the sign-in, new-password, and confirm-password fields", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) return Promise.resolve({ data: { otp: "111111" } });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignin();
    const user = userEvent.setup();

    const passwordInput = screen.getByPlaceholderText(
      "Enter your password"
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
    await user.click(passwordInput.parentElement!.querySelector("button")!);
    expect(passwordInput.type).toBe("text");

    await user.click(screen.getByText("Forgot Password?"));
    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "user@example.com"
    );
    await user.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    const otpInputs = screen
      .getAllByRole("textbox")
      .filter((el) => el !== screen.getByPlaceholderText("Enter your email"));
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "111111"[i]);
    }
    await user.click(screen.getByText("Verify"));
    await waitFor(() =>
      expect(screen.getByText("New Password")).toBeInTheDocument()
    );

    const newPasswordInput = screen.getByPlaceholderText(
      "Enter new password"
    ) as HTMLInputElement;
    expect(newPasswordInput.type).toBe("password");
    await user.click(
      newPasswordInput.parentElement!.querySelector("button")!
    );
    expect(newPasswordInput.type).toBe("text");

    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    ) as HTMLInputElement;
    expect(confirmPasswordInput.type).toBe("password");
    await user.click(
      confirmPasswordInput.parentElement!.querySelector("button")!
    );
    expect(confirmPasswordInput.type).toBe("text");
  });
});
