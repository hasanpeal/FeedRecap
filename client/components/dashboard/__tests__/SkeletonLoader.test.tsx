import { render } from "@testing-library/react";
import { SkeletonLoader, PostSkeleton } from "../SkeletonLoader";

describe("SkeletonLoader", () => {
  it("renders 6 skeleton post cards in the grid", () => {
    const { container } = render(<SkeletonLoader />);
    const cards = container.querySelectorAll(
      ".grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-3 > div"
    );
    expect(cards).toHaveLength(6);
  });
});

describe("PostSkeleton", () => {
  it("renders a single skeleton card", () => {
    const { container } = render(<PostSkeleton />);
    expect(container.querySelector(".post-card")).toBeInTheDocument();
  });
});
