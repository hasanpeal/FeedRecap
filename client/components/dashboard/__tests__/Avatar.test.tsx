import { render, screen } from "@testing-library/react";
import { Avatar } from "../Avatar";

describe("Avatar", () => {
  it("renders initials when no avatar is provided", () => {
    render(<Avatar username="john_doe" avatar="" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders initials when avatar is the placeholder", () => {
    render(<Avatar username="jane.smith" avatar="/placeholder.svg" />);
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("renders an <img> for an external https avatar url", () => {
    render(
      <Avatar username="john" avatar="https://example.com/pic.png" size="large" />
    );
    const img = screen.getByAltText("john") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("https://example.com/pic.png");
  });

  it("falls back to initials on image error for an external avatar", () => {
    render(<Avatar username="john_doe" avatar="https://example.com/pic.png" />);
    const img = screen.getByAltText("john_doe");
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.style.display).toBe("none");
  });

  it("renders a next/image for a local (non-http) avatar path", () => {
    render(<Avatar username="john_doe" avatar="/uploads/pic.png" />);
    const img = screen.getByAltText("john_doe");
    expect(img.tagName).toBe("IMG");
  });

  it("falls back to initials on image error for a local avatar", () => {
    render(<Avatar username="john_doe" avatar="/uploads/pic.png" />);
    const img = screen.getByAltText("john_doe");
    img.dispatchEvent(new Event("error", { bubbles: true }));
    expect(img.style.display).toBe("none");
  });

  it("uses small dimensions by default and large when size='large'", () => {
    const { rerender, container } = render(
      <Avatar username="ab" avatar="" size="small" />
    );
    expect(container.querySelector(".w-6.h-6")).toBeInTheDocument();

    rerender(<Avatar username="ab" avatar="" size="large" />);
    expect(container.querySelector(".w-10.h-10")).toBeInTheDocument();
  });
});
