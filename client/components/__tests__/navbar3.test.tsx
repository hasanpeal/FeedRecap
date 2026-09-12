import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { toast } from "react-hot-toast";
import Navbar3 from "../navbar3";
import { EmailProvider, useEmail } from "@/context/UserContext";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush, replace: jest.fn() })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

function SetEmail({ email }: { email: string }) {
  const { setEmailContext } = useEmail();
  useEffect(() => {
    setEmailContext(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderWithEmail(email?: string) {
  return render(
    <EmailProvider>
      {email !== undefined && <SetEmail email={email} />}
      <Navbar3 />
    </EmailProvider>
  );
}

describe("Navbar3", () => {
  beforeEach(() => {
    localStorage.clear();
    // .mockReset() (not clearAllMocks/jest.fn().mockClear()) on the two
    // axios methods specifically, so a persistent `mockResolvedValue` set by
    // one test can't leak into a later test — without touching the
    // useRouter/toast mocks' baked-in implementations.
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockPush.mockClear();
    (toast.error as jest.Mock).mockClear();
    (toast.success as jest.Mock).mockClear();
    (HTMLDialogElement.prototype.showModal as jest.Mock).mockClear();
    (HTMLDialogElement.prototype.close as jest.Mock).mockClear();
    mockedAxios.get.mockResolvedValue({ status: 200, data: {} });
  });

  it("renders the brand linking to /dashboard", () => {
    renderWithEmail();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
  });

  it("fetches user details once an email context is set, regardless of a stored token", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { firstName: "Grace", lastName: "Hopper" },
    });

    renderWithEmail("grace@example.com");

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/getUserDetails"),
        expect.any(Object)
      )
    );
  });

  it("shows the Admin link once checkAdmin resolves isAdmin: true with a token", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { code: 0, isAdmin: true, firstName: "A", lastName: "B" },
    });

    renderWithEmail("admin@example.com");

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute(
        "href",
        "/admin"
      )
    );
  });

  it("does not show the Admin link when isAdmin is false", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { code: 0, isAdmin: false },
    });

    renderWithEmail("user@example.com");

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("shows an error toast when fetchUserDetails gets a non-200 status", async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 500, data: {} });

    renderWithEmail("user@example.com");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Error fetching user details.")
    );
  });

  it("shows an error toast when fetchUserDetails throws", async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error("down"));

    renderWithEmail("user@example.com");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Error fetching user details.")
    );
  });

  // The "Update Account" trigger button in the nav is commented out in the
  // component (dead code), but the account_modal dialog and its handler are
  // still rendered/reachable, so we exercise handleAccountUpdate directly
  // through its still-present "Update Account" button.
  describe("handleAccountUpdate", () => {
    async function renderWithProfile() {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { firstName: "Ada", lastName: "Lovelace" },
      });
      renderWithEmail("ada@example.com");
      await waitFor(() =>
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining("/getUserDetails"),
          expect.any(Object)
        )
      );
      mockedAxios.get.mockReset();
    }

    it("shows a validation error and skips the request when email is blank", async () => {
      // firstName/lastName stay blank without a prior fetchUserDetails call.
      renderWithEmail();
      await userEvent.click(
        screen.getByRole("button", { name: /update account/i, hidden: true })
      );

      expect(toast.error).toHaveBeenCalledWith(
        "Please ensure all fields are filled."
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("updates the account and stores a new token when one is returned", async () => {
      await renderWithProfile();
      const emailInput = screen.getByPlaceholderText("Email");
      fireEvent.change(emailInput, { target: { value: "ada@newmail.com" } });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { code: 0, token: "new-jwt" },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: { isAuthenticated: true, email: "ada@newmail.com" },
      });

      await userEvent.click(
        screen.getByRole("button", { name: /update account/i, hidden: true })
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Account updated successfully")
      );
      expect(localStorage.getItem("token")).toBe("new-jwt");
      await waitFor(() =>
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining("/check-session"),
          expect.any(Object)
        )
      );
    });

    it("falls back to the typed email when the check-session call fails", async () => {
      await renderWithProfile();
      const emailInput = screen.getByPlaceholderText("Email");
      fireEvent.change(emailInput, { target: { value: "ada@newmail.com" } });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { code: 0, token: "new-jwt" },
      });
      mockedAxios.get.mockRejectedValueOnce(new Error("down"));

      await userEvent.click(
        screen.getByRole("button", { name: /update account/i, hidden: true })
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Account updated successfully")
      );
    });

    it("updates without storing a token when the response has none", async () => {
      await renderWithProfile();
      const emailInput = screen.getByPlaceholderText("Email");
      fireEvent.change(emailInput, { target: { value: "ada@newmail.com" } });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { code: 0 },
      });

      await userEvent.click(
        screen.getByRole("button", { name: /update account/i, hidden: true })
      );

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Account updated successfully")
      );
      expect(localStorage.getItem("token")).toBeNull();
    });

    it("shows the server's error message when the update is rejected", async () => {
      await renderWithProfile();
      const emailInput = screen.getByPlaceholderText("Email");
      fireEvent.change(emailInput, { target: { value: "ada@newmail.com" } });

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { code: 1, message: "Email already in use" },
      });

      await userEvent.click(
        screen.getByRole("button", { name: /update account/i, hidden: true })
      );

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Email already in use")
      );
    });

    it("shows a generic error toast when the update request throws", async () => {
      await renderWithProfile();
      const emailInput = screen.getByPlaceholderText("Email");
      fireEvent.change(emailInput, { target: { value: "ada@newmail.com" } });

      mockedAxios.post.mockRejectedValueOnce(new Error("network down"));

      await userEvent.click(
        screen.getByRole("button", { name: /update account/i, hidden: true })
      );

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Error updating account.")
      );
    });
  });

  it("toggles the mobile menu open and closes it on an outside click", async () => {
    renderWithEmail();
    const hamburger = screen.getByRole("button", { name: "" });
    await userEvent.click(hamburger);

    const nav = screen
      .getByRole("button", { name: /logout/i })
      .closest("nav") as HTMLElement;
    expect(nav.className).toContain("block bg-black");

    fireEvent.click(document.body);

    await waitFor(() => expect(nav.className).toContain("hidden"));
  });

  it("logs out successfully: clears storage and navigates home", async () => {
    localStorage.setItem("token", "tok");
    localStorage.setItem("cookieConsent", "true");
    mockedAxios.post.mockResolvedValueOnce({ status: 200 });

    renderWithEmail();
    await userEvent.click(screen.getByRole("button", { name: /logout/i, hidden: true }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("cookieConsent")).toBeNull();
  });

  it("shows an error toast when the logout response is not 200", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.post.mockResolvedValueOnce({ status: 500 });

    renderWithEmail();
    await userEvent.click(screen.getByRole("button", { name: /logout/i, hidden: true }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Error logging out.")
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("still clears the token and navigates home when the logout request fails", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.post.mockRejectedValueOnce(new Error("down"));

    renderWithEmail();
    await userEvent.click(screen.getByRole("button", { name: /logout/i, hidden: true }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("shows an error toast for feedback submission without a token", async () => {
    renderWithEmail();
    await userEvent.click(
      screen.getByRole("button", { name: /feedback/i, hidden: true })
    );
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hi" } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Please sign in to submit feedback")
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("submits feedback successfully when a token exists", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    renderWithEmail();
    await userEvent.click(
      screen.getByRole("button", { name: /feedback/i, hidden: true })
    );
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "great app" } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/contact"),
        { message: "great app" },
        { headers: { Authorization: "Bearer tok" } }
      )
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Report submitted successfully")
    );
  });

  it("shows an error toast when feedback submission fails", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.post.mockRejectedValueOnce(new Error("down"));

    renderWithEmail();
    await userEvent.click(
      screen.getByRole("button", { name: /feedback/i, hidden: true })
    );
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "bug report" } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to submit the report")
    );
  });
});
