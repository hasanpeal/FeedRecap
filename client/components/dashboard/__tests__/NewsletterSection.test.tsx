import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewsletterSection } from "../NewsletterSection";

describe("NewsletterSection", () => {
  it("renders a fallback message when there is no newsletter content", () => {
    render(
      <NewsletterSection
        latestNewsletter={null}
        newlatestNewsletter={null}
        newsID={null}
        onShareOnX={jest.fn()}
      />
    );
    expect(screen.getByText("No newsletters available.")).toBeInTheDocument();
  });

  it("renders the newsletter HTML content", () => {
    render(
      <NewsletterSection
        latestNewsletter="content"
        newlatestNewsletter="<p>Hello <a href='#'>View Post</a></p>"
        newsID="123"
        onShareOnX={jest.fn()}
      />
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("View Post")).toBeInTheDocument();
  });

  it("underlines up to the first 15 'View Post' links and restyles other anchors", () => {
    const links = Array.from(
      { length: 17 },
      (_, i) => `<a href="#">View Post</a>`
    ).join("");
    render(
      <NewsletterSection
        latestNewsletter="content"
        newlatestNewsletter={`<p>${links}<a href="#">Other Link</a></p>`}
        newsID="123"
        onShareOnX={jest.fn()}
      />
    );
    const viewPostLinks = screen.getAllByText("View Post");
    expect(viewPostLinks).toHaveLength(17);
    // First 15 get re-underlined, the rest keep the stripped style.
    expect(viewPostLinks[0].style.textDecoration).toBe("underline");
    expect(viewPostLinks[16].style.textDecoration).toBe("none");

    const otherLink = screen.getByText("Other Link");
    expect(otherLink.style.textDecoration).toBe("none");
  });

  it("strips styling from <em>/<i> emphasis elements too", () => {
    render(
      <NewsletterSection
        latestNewsletter="content"
        newlatestNewsletter="<p><em>emphasized</em> and <i>italic</i></p>"
        newsID="123"
        onShareOnX={jest.fn()}
      />
    );
    expect(screen.getByText("emphasized").style.textDecoration).toBe("none");
    expect(screen.getByText("italic").style.textDecoration).toBe("none");
  });

  it("hides the Share on X button for the default placeholder newsletter", () => {
    render(
      <NewsletterSection
        latestNewsletter="Thank you for signing up. Please wait for your first newsletter to generate"
        newlatestNewsletter="<p>placeholder</p>"
        newsID={null}
        onShareOnX={jest.fn()}
      />
    );
    expect(
      screen.queryByRole("button", { name: /Share on/ })
    ).not.toBeInTheDocument();
  });

  it("shows the Share on X button and calls onShareOnX when clicked", async () => {
    const user = userEvent.setup();
    const onShareOnX = jest.fn();
    render(
      <NewsletterSection
        latestNewsletter="real content"
        newlatestNewsletter="<p>real content</p>"
        newsID="1"
        onShareOnX={onShareOnX}
      />
    );
    const btn = screen.getByRole("button", { name: /Share on/ });
    await user.click(btn);
    expect(onShareOnX).toHaveBeenCalledTimes(1);
  });
});
