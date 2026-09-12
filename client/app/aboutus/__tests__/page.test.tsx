import { render, screen } from "@testing-library/react";
import AboutUs from "../page";

describe("AboutUs page", () => {
  it("renders the mission and FAQ content", () => {
    render(<AboutUs />);
    expect(
      screen.getByRole("heading", { name: "About Us" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Our Mission" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Frequently Asked Questions" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("How do I change my preferences?")
    ).toBeInTheDocument();
  });
});
