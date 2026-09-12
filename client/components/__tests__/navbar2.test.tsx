import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Navbar2 from "../navbar2";
import { EmailProvider, useEmail } from "@/context/UserContext";

jest.mock("axios");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

// Navbar2 only fetches user details once `emailContext` is truthy, and that
// value is normally set by a sibling (e.g. the signin page) via
// `setEmailContext`. This helper does that on mount so tests can exercise
// the fetch-on-context-set behavior.
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
      <Navbar2 />
    </EmailProvider>
  );
}

describe("Navbar2", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("renders the brand and does not fetch user details when there is no email context", () => {
    renderWithEmail();
    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("fetches user details once an email context is set", async () => {
    localStorage.setItem("token", "tok");
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
  });

  it("does not fetch user details when there is an email context but no stored token", () => {
    renderWithEmail("ada@example.com");
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("shows an error notification when fetching user details fails", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.get.mockRejectedValueOnce(new Error("down"));

    renderWithEmail("ada@example.com");

    await waitFor(() =>
      expect(screen.getByText("Error fetching user details.")).toBeInTheDocument()
    );
  });

  it("shows an error notification when the response status is not 200", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.get.mockResolvedValueOnce({ status: 500, data: {} });

    renderWithEmail("ada@example.com");

    await waitFor(() =>
      expect(screen.getByText("Error fetching user details.")).toBeInTheDocument()
    );
  });

  it("opens the contact modal on 'Contact Us' click", async () => {
    renderWithEmail();
    await userEvent.click(screen.getByRole("button", { name: /contact us/i }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("closes the contact modal via the × button", async () => {
    renderWithEmail();
    await userEvent.click(
      screen.getByRole("button", { name: "×", hidden: true })
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("shows an error notification when submitting the contact form without a token", async () => {
    renderWithEmail();
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hi" } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(
        screen.getByText("Please sign in to send a message")
      ).toBeInTheDocument()
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("submits the contact form and shows a success notification when a token exists", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    renderWithEmail();
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hi" } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/contact"),
        { message: "hi" },
        { headers: { Authorization: "Bearer tok" } }
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Message sent successfully")).toBeInTheDocument()
    );
  });

  it("shows an error notification when the contact request fails", async () => {
    localStorage.setItem("token", "tok");
    mockedAxios.post.mockRejectedValueOnce(new Error("down"));

    renderWithEmail();
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hi" } });
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(screen.getByText("Failed to send the message")).toBeInTheDocument()
    );
  });
});
