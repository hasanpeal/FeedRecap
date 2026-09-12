import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnnouncementBar from "../announcement";

describe("AnnouncementBar", () => {
  afterEach(() => {
    document.body.style.marginTop = "";
  });

  it("renders the announcement text and a sign-up link", () => {
    render(<AnnouncementBar />);
    expect(screen.getByText(/Call to Action/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up now/i })).toHaveAttribute(
      "href",
      "/signup"
    );
  });

  it("adds top margin to the body while visible", () => {
    render(<AnnouncementBar />);
    expect(document.body.style.marginTop).toBe("40px");
  });

  it("dismisses the bar and resets the body margin when the close button is clicked", async () => {
    render(<AnnouncementBar />);
    await userEvent.click(screen.getByRole("button", { name: "✖" }));

    expect(screen.queryByText(/Call to Action/i)).not.toBeInTheDocument();
    expect(document.body.style.marginTop).toBe("0px");
  });
});
