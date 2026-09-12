import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import CookieConsent from "../cookies";

jest.mock("axios");
jest.mock("../cookies.css", () => ({}), { virtual: true });

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("fetches consent status and reveals the modal when the server has no consent on file", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });
    render(<CookieConsent />);

    await waitFor(() =>
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/getCookieConsent"),
        { withCredentials: true }
      )
    );
    await waitFor(() => {
      const dialog = document.getElementById("cookie-modal") as HTMLElement;
      expect(dialog.style.display).toBe("block");
    });
  });

  it("does not fetch consent when it is already stored locally", () => {
    localStorage.setItem("cookieConsent", "true");
    render(<CookieConsent />);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("accepting stores consent, posts it, and hides the modal", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });
    mockedAxios.post.mockResolvedValueOnce({ data: {} });
    render(<CookieConsent />);

    await userEvent.click(screen.getByRole("button", { name: /accept/i }));

    expect(localStorage.getItem("cookieConsent")).toBe("true");
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateCookieConsent"),
        { consent: true },
        { withCredentials: true }
      )
    );
    const dialog = document.getElementById("cookie-modal") as HTMLElement;
    expect(dialog.style.display).toBe("none");
  });

  it("declining stores consent as false and posts it", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: {} });
    mockedAxios.post.mockResolvedValueOnce({ data: {} });
    render(<CookieConsent />);

    await userEvent.click(screen.getByRole("button", { name: /decline/i }));

    expect(localStorage.getItem("cookieConsent")).toBe("false");
    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/updateCookieConsent"),
        { consent: false },
        { withCredentials: true }
      )
    );
  });

  it("logs an error and does not throw when fetching consent fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedAxios.get.mockRejectedValueOnce(new Error("down"));

    render(<CookieConsent />);

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        "Error fetching cookie consent:",
        expect.any(Error)
      )
    );
    errorSpy.mockRestore();
  });

  it("logs an error and does not throw when updating consent fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedAxios.get.mockResolvedValueOnce({ data: {} });
    mockedAxios.post.mockRejectedValueOnce(new Error("down"));

    render(<CookieConsent />);
    await userEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        "Error updating cookie consent:",
        expect.any(Error)
      )
    );
    errorSpy.mockRestore();
  });
});
