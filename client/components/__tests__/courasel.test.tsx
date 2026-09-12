import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Carousel from "../courasel";

// The carousel imports @/public/A1.png..A4.png, which do not actually exist
// in client/public (pre-existing issue, out of scope here). Under Jest,
// next/jest's file-mock moduleNameMapper intercepts any *.png import by
// extension before real module resolution happens, so the component still
// renders fine in tests even though this would presumably fail a real build.

function getWrapperTransform() {
  const wrapper = document.querySelector(".carousel-wrapper") as HTMLElement;
  return wrapper.style.transform;
}

describe("Carousel", () => {
  it("renders all four slides and starts at the first one", () => {
    render(<Carousel />);
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(getWrapperTransform()).toBe("translateX(-0%)");
  });

  it("advances to the next slide on 'next' click, wrapping back to the first", async () => {
    render(<Carousel />);
    const next = screen.getByRole("button", { name: "❯" });

    await userEvent.click(next);
    expect(getWrapperTransform()).toBe("translateX(-100%)");

    await userEvent.click(next);
    await userEvent.click(next);
    await userEvent.click(next);
    // 4 slides total: index wraps from 3 back to 0.
    expect(getWrapperTransform()).toBe("translateX(-0%)");
  });

  it("goes to the previous slide on 'prev' click, wrapping to the last", async () => {
    render(<Carousel />);
    const prev = screen.getByRole("button", { name: "❮" });

    await userEvent.click(prev);
    // From index 0, prev wraps to the last slide (index 3).
    expect(getWrapperTransform()).toBe("translateX(-300%)");
  });
});
