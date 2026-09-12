import { render, screen } from "@testing-library/react";
import Navbar from "../navbar";

describe("Navbar (smoke)", () => {
  it("renders the brand and sign in/up links", () => {
    render(<Navbar />);
    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/signin"
    );
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup"
    );
  });
});
