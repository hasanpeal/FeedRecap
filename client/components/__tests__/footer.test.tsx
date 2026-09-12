import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from "react-hot-toast";
import Footer from "../footer";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// jsdom doesn't implement <dialog>.showModal()/close() — stub them so the
// component's calls don't throw "Not implemented" errors.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

describe("Footer", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("renders the copyright and nav links", () => {
    render(<Footer />);
    expect(
      screen.getByText(new RegExp(`${new Date().getFullYear()} FeedRecap`))
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about us/i })).toHaveAttribute(
      "href",
      "/aboutus"
    );
  });

  it("opens the contact modal when 'Contact Us' is clicked", async () => {
    render(<Footer />);
    await userEvent.click(screen.getByRole("button", { name: /contact us/i }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("shows an error toast and does not call axios when submitting without a token", async () => {
    render(<Footer />);
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hello there");
    const form = textarea.closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Please sign in to send a message"
      )
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("submits the message and shows a success toast when a token exists", async () => {
    localStorage.setItem("token", "test-token");
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    render(<Footer />);
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hello there");
    const form = textarea.closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/contact"),
        { message: "Hello there" },
        { headers: { Authorization: "Bearer test-token" } }
      )
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Email sent successfully")
    );
  });

  it("shows an error toast when the contact request fails", async () => {
    localStorage.setItem("token", "test-token");
    mockedAxios.post.mockRejectedValueOnce(new Error("network down"));

    render(<Footer />);
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hello there");
    const form = textarea.closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to send email")
    );
  });
});
