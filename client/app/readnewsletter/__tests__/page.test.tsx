import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import ReadNewsletter from "../page";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("ReadNewsletter page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows an error when no newsletter id is provided", async () => {
    render(<ReadNewsletter searchParams={{}} />);
    await waitFor(() =>
      expect(screen.getByText("No newsletter ID provided.")).toBeInTheDocument()
    );
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("shows a loading spinner then the fetched newsletter content", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { newsletter: "<p>Hello world</p>" },
    });

    render(<ReadNewsletter searchParams={{ newsletter: "abc123" }} />);

    expect(screen.queryByText("Newsletter Content")).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Newsletter Content")).toBeInTheDocument()
    );
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("/newsletter/abc123")
    );
  });

  it("shows an error message when the fetch fails", async () => {
    mockedAxios.get.mockRejectedValue({
      response: { data: "Newsletter not found" },
    });

    render(<ReadNewsletter searchParams={{ newsletter: "missing" }} />);

    await waitFor(() =>
      expect(screen.getByText("Newsletter not found")).toBeInTheDocument()
    );
  });

  it("falls back to a generic error message when the failure has no response body", async () => {
    mockedAxios.get.mockRejectedValue(new Error("network down"));

    render(<ReadNewsletter searchParams={{ newsletter: "missing" }} />);

    await waitFor(() =>
      expect(
        screen.getByText("An error occurred while fetching the newsletter.")
      ).toBeInTheDocument()
    );
  });
});
