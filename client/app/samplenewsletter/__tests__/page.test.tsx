import { render, screen } from "@testing-library/react";
import SampleNewsletter from "../page";

// This page is entirely static markup (hardcoded sample newsletter content,
// no hooks/state/branching), so a render smoke test covers it fully.
jest.mock("@/components/navbar2", () => {
  const Navbar2Mock = () => <div>navbar2</div>;
  return Navbar2Mock;
});
jest.mock("@/components/footer", () => {
  const FooterMock = () => <div>footer</div>;
  return FooterMock;
});

describe("SampleNewsletter page", () => {
  it("renders the hero heading, navbar, footer, and sample newsletter content", () => {
    render(<SampleNewsletter />);

    expect(
      screen.getByText("Sample Newsletters You Can Expect from FeedRecap")
    ).toBeInTheDocument();
    expect(screen.getByText("navbar2")).toBeInTheDocument();
    expect(screen.getByText("footer")).toBeInTheDocument();
    expect(screen.getByText("Newsletter 1:")).toBeInTheDocument();
  });
});
