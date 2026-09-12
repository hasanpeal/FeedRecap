import { render } from "@testing-library/react";
import { XLogo } from "../XLogo";

describe("XLogo", () => {
  it("renders an svg with the default size", () => {
    const { container } = render(<XLogo />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("renders with a custom size and className", () => {
    const { container } = render(<XLogo size={40} className="text-red-500" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "40");
    expect(svg).toHaveAttribute("height", "40");
    expect(svg).toHaveClass("text-red-500");
  });
});
