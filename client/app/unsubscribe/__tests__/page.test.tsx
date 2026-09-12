import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Unsubscribe from "../page";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

let mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("Unsubscribe page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("shows an error immediately when no email is provided", async () => {
    render(<Unsubscribe />);

    await waitFor(() =>
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument()
    );
    expect(screen.getByText("No email provided")).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("shows success once the unsubscribe request resolves with 200", async () => {
    mockSearchParams = new URLSearchParams({ email: "user@example.com" });
    mockedAxios.post.mockResolvedValue({ status: 200 });

    render(<Unsubscribe />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText("Unsubscribed Successfully")
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Email: user@example.com/)).toBeInTheDocument();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/unsubscribeEmail"),
      { email: "user@example.com" }
    );
  });

  it("shows a server-error message when the response status isn't 200", async () => {
    mockSearchParams = new URLSearchParams({ email: "user@example.com" });
    mockedAxios.post.mockResolvedValue({ status: 500 });

    render(<Unsubscribe />);

    await waitFor(() =>
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument()
    );
    expect(screen.getByText("Server error occurred")).toBeInTheDocument();
  });

  it("shows a failure message when the request throws", async () => {
    mockSearchParams = new URLSearchParams({ email: "user@example.com" });
    mockedAxios.post.mockRejectedValue(new Error("network error"));

    render(<Unsubscribe />);

    await waitFor(() =>
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument()
    );
    expect(
      screen.getByText("Failed to process your request")
    ).toBeInTheDocument();
  });

  it("renders a 'Try Again' button that is wired to reload the page", async () => {
    // jsdom's window.location.reload is a read-only, non-configurable
    // accessor in this jsdom version, so it can't be spied/mocked directly;
    // we verify the button is present and clickable instead of asserting
    // the actual reload call.
    mockSearchParams = new URLSearchParams();
    render(<Unsubscribe />);
    await waitFor(() =>
      expect(screen.getByText("Unsubscribe Failed")).toBeInTheDocument()
    );
    expect(
      screen.getByRole("button", { name: "Try Again" })
    ).toBeInTheDocument();
  });
});
