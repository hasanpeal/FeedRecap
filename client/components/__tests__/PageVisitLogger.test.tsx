import { render, waitFor } from "@testing-library/react";
import { PageVisitLogger } from "../PageVisitLogger";
import apiClient from "@/utils/axios";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));
jest.mock("@/utils/axios", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const { usePathname } = jest.requireMock("next/navigation") as {
  usePathname: jest.Mock;
};
const mockedApiClient = apiClient as unknown as { post: jest.Mock };

describe("PageVisitLogger", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    usePathname.mockReturnValue("/dashboard");
  });

  it("renders nothing", () => {
    const { container } = render(<PageVisitLogger />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not log a page visit when there is no stored token", async () => {
    render(<PageVisitLogger />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it("logs the current pathname when a token is present", async () => {
    localStorage.setItem("token", "abc123");
    mockedApiClient.post.mockResolvedValueOnce({ data: {} });

    render(<PageVisitLogger />);

    await waitFor(() =>
      expect(mockedApiClient.post).toHaveBeenCalledWith("/logPageVisit", {
        page: "/dashboard",
      })
    );
  });

  it("silently swallows a logging failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("token", "abc123");
    mockedApiClient.post.mockRejectedValueOnce(new Error("down"));

    render(<PageVisitLogger />);

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        "Error logging page visit:",
        expect.any(Error)
      )
    );
    errorSpy.mockRestore();
  });

  it("re-logs when the pathname changes", async () => {
    localStorage.setItem("token", "abc123");
    mockedApiClient.post.mockResolvedValue({ data: {} });

    const { rerender } = render(<PageVisitLogger />);
    await waitFor(() =>
      expect(mockedApiClient.post).toHaveBeenCalledWith("/logPageVisit", {
        page: "/dashboard",
      })
    );

    usePathname.mockReturnValue("/settings");
    rerender(<PageVisitLogger />);

    await waitFor(() =>
      expect(mockedApiClient.post).toHaveBeenCalledWith("/logPageVisit", {
        page: "/settings",
      })
    );
  });
});
