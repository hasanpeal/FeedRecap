import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from "react-hot-toast";
import Footer2 from "../footer2";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

describe("Footer2", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("renders the copyright and nav links", () => {
    render(<Footer2 />);
    expect(
      screen.getByText(new RegExp(`${new Date().getFullYear()} FeedRecap`))
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about us/i })).toHaveAttribute(
      "href",
      "/aboutus"
    );
  });

  it("opens the contact modal when 'Contact Us' is clicked", async () => {
    render(<Footer2 />);
    await userEvent.click(screen.getByRole("button", { name: /contact us/i }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("shows an error toast and skips axios when there is no stored token", async () => {
    render(<Footer2 />);
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hi");
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

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

    render(<Footer2 />);
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hi");
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/contact"),
        { message: "Hi" },
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

    render(<Footer2 />);
    const textarea = document.querySelector(
      "textarea[name='message']"
    ) as HTMLTextAreaElement;
    await userEvent.type(textarea, "Hi");
    fireEvent.submit(textarea.closest("form") as HTMLFormElement);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to send email")
    );
  });
});
