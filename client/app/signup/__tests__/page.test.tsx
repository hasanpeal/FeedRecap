import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Signup from "../page";
import { EmailProvider } from "@/context/UserContext";

// The page's own <Navbar /> also renders a "Sign Up" link/button, so
// `getByRole("button", { name: "Sign Up" })` alone is ambiguous — scope the
// query to the auth card (the closest ancestor <div> of the "Sign Up"
// heading) to get the actual submit button.
function getSubmitButton() {
  const card = screen
    .getByRole("heading", { name: "Sign Up" })
    .closest("div") as HTMLElement;
  return within(card).getByRole("button", { name: "Sign Up" });
}

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const pushMock = jest.fn();
// A real Next.js router instance is referentially stable across renders;
// returning a fresh object literal from useRouter() would break any effect
// with `router` in its dependency array (it'd re-fire on every render).
const routerMock = { push: pushMock };
jest.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

function renderSignup() {
  return render(
    <EmailProvider>
      <Signup />
    </EmailProvider>
  );
}

describe("Signup page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/signup");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.reject(new Error("no session"));
      }
      if (url.includes("/validateEmail")) {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.reject(new Error("unexpected url"));
    });
  });

  it("renders the signup form with no saved session", async () => {
    renderSignup();
    expect(
      screen.getByRole("heading", { name: "Sign Up" })
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

    renderSignup();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("removes an invalid saved token instead of redirecting", async () => {
    window.localStorage.setItem("token", "bad-token");
    mockedAxios.get.mockResolvedValue({ data: { isAuthenticated: false } });

    renderSignup();

    await waitFor(() =>
      expect(window.localStorage.getItem("token")).toBeNull()
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("logs in via a Google OAuth callback (code=0 with token)", async () => {
    window.history.pushState({}, "", "/signup?code=0&token=oauth-jwt");
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) {
        return Promise.resolve({
          data: { isAuthenticated: true, email: "oauth@example.com" },
        });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignup();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(window.localStorage.getItem("token")).toBe("oauth-jwt");
  });

  it("shows validation errors for an empty submission", async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(screen.getByText("Email is required")).toBeInTheDocument()
    );
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("shows an invalid-email error", async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "not-an-email"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(screen.getByText("Not a valid email")).toBeInTheDocument()
    );
  });

  it("shows an already-registered error for an existing email", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      if (url.includes("/validateEmail")) return Promise.resolve({ status: 200 });
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignup();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "existing@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(
        screen.getByText("Email already registered")
      ).toBeInTheDocument()
    );
  });

  it("shows a weak-password error", async () => {
    renderSignup();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "new@example.com"
    );
    await user.type(screen.getByPlaceholderText("Enter your password"), "abc");
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(
        screen.getByText(
          "Password must be at least 8 characters long and include a letter and a number"
        )
      ).toBeInTheDocument()
    );
  });

  it("sends an OTP on valid submission and moves to the OTP screen", async () => {
    mockedAxios.post.mockResolvedValue({ data: { otp: "654321" } });

    renderSignup();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "new@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/sentOTP"),
      { email: "new@example.com" }
    );
  });

  it("shows a toast error when OTP generation fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("network error"));

    renderSignup();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "new@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(screen.getByText("Error generating OTP")).toBeInTheDocument()
    );
  });

  // Only wires up /sentOTP. If a test also needs /register mocked, set that
  // up on mockedAxios.post BEFORE calling this helper — see note below on
  // why it can't just extend whatever the caller already configured.
  async function fillAndSubmitToOtpScreen(user: ReturnType<typeof userEvent.setup>) {
    const priorPostImpl = mockedAxios.post.getMockImplementation();
    mockedAxios.post.mockImplementation((url: string, ...rest: unknown[]) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "654321" } });
      }
      if (priorPostImpl) {
        return priorPostImpl(url, ...rest);
      }
      return Promise.reject(new Error("unexpected url"));
    });

    await user.type(
      screen.getByPlaceholderText("Enter your email"),
      "new@example.com"
    );
    await user.type(
      screen.getByPlaceholderText("Enter your password"),
      "password123"
    );
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(
        screen.getByText("Please enter the 6-digit OTP sent to your email")
      ).toBeInTheDocument()
    );

    return screen.getAllByRole("textbox");
  }

  it("shows a wrong-OTP message for an incorrect code", async () => {
    renderSignup();
    const user = userEvent.setup();
    const otpInputs = await fillAndSubmitToOtpScreen(user);

    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "000000"[i]);
    }
    await user.click(screen.getByText("Verify"));

    await waitFor(() =>
      expect(screen.getByText("Wrong OTP")).toBeInTheDocument()
    );
  });

  it("registers successfully on the correct OTP and redirects to /dashboard", async () => {
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "654321" } });
      }
      if (url.includes("/register")) {
        return Promise.resolve({
          status: 201,
          data: { code: 0, token: "jwt-token", email: "new@example.com" },
        });
      }
      return Promise.reject(new Error("unexpected url"));
    });
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("/check-session")) return Promise.reject(new Error("no session"));
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignup();
    const user = userEvent.setup();
    const otpInputs = await fillAndSubmitToOtpScreen(user);

    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "654321"[i]);
    }
    await user.click(screen.getByText("Verify"));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(window.localStorage.getItem("token")).toBe("jwt-token");
  });

  it("shows a 'user already exists' toast on a 409 register error", async () => {
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "654321" } });
      }
      if (url.includes("/register")) {
        return Promise.reject({ response: { status: 409 } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignup();
    const user = userEvent.setup();
    const otpInputs = await fillAndSubmitToOtpScreen(user);

    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "654321"[i]);
    }
    await user.click(screen.getByText("Verify"));

    await waitFor(() =>
      expect(screen.getByText("User already exists")).toBeInTheDocument()
    );
  });

  it("shows a generic toast on a non-409 register error", async () => {
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "654321" } });
      }
      if (url.includes("/register")) {
        return Promise.reject(new Error("server exploded"));
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignup();
    const user = userEvent.setup();
    const otpInputs = await fillAndSubmitToOtpScreen(user);

    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "654321"[i]);
    }
    await user.click(screen.getByText("Verify"));

    await waitFor(() =>
      expect(
        screen.getByText("An error occurred during signup")
      ).toBeInTheDocument()
    );
  });

  it("shows a server-error toast when the register call returns a non-201 status", async () => {
    mockedAxios.post.mockImplementation((url: string) => {
      if (url.includes("/sentOTP")) {
        return Promise.resolve({ data: { otp: "654321" } });
      }
      if (url.includes("/register")) {
        return Promise.resolve({ status: 200, data: { code: 1 } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSignup();
    const user = userEvent.setup();
    const otpInputs = await fillAndSubmitToOtpScreen(user);

    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], "654321"[i]);
    }
    await user.click(screen.getByText("Verify"));

    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument()
    );
  });

  it("edits an OTP digit with backspace", async () => {
    renderSignup();
    const user = userEvent.setup();
    const otpInputs = await fillAndSubmitToOtpScreen(user);

    await user.type(otpInputs[0], "7");
    expect((otpInputs[0] as HTMLInputElement).value).toBe("7");
    await user.type(otpInputs[0], "{backspace}");
    expect((otpInputs[0] as HTMLInputElement).value).toBe("");
  });

  it("shows a required-field error when the OTP is left incomplete", async () => {
    renderSignup();
    const user = userEvent.setup();
    await fillAndSubmitToOtpScreen(user);

    await user.click(screen.getByText("Verify"));

    // Incomplete OTP shows a red border on the empty boxes rather than text,
    // so assert we're still on the OTP screen and no verify request fired.
    expect(
      screen.getByText("Please enter the 6-digit OTP sent to your email")
    ).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining("/register"),
      expect.anything()
    );
  });
});
