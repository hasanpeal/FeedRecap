import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TutorialOverlay } from "../tutorial-overlay";

beforeAll(() => {
  // jsdom doesn't implement scrollIntoView.
  Element.prototype.scrollIntoView = jest.fn();
});

function makeProps(overrides: Partial<Parameters<typeof TutorialOverlay>[0]> = {}) {
  return {
    isOpen: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
    ...overrides,
  };
}

describe("TutorialOverlay", () => {
  it("renders nothing when isOpen is false", () => {
    const props = makeProps({ isOpen: false });
    const { container } = render(<TutorialOverlay {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the first step's title and 'Step 1 of N' when open", () => {
    render(<TutorialOverlay {...makeProps()} />);
    expect(screen.getByText("Newsfeed")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/)).toBeInTheDocument();
    // No "Previous" button on the first step.
    expect(
      screen.queryByRole("button", { name: /previous/i })
    ).not.toBeInTheDocument();
  });

  it("advances to the next step and shows a Previous button", async () => {
    render(<TutorialOverlay {...makeProps()} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Newsletter")).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 8/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
  });

  it("goes back to the previous step", async () => {
    render(<TutorialOverlay {...makeProps()} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /previous/i }));

    expect(screen.getByText("Newsfeed")).toBeInTheDocument();
  });

  it("calls onComplete when 'Finish' is clicked on the last step", async () => {
    const onComplete = jest.fn();
    render(<TutorialOverlay {...makeProps({ onComplete })} />);

    // Step titles: Newsfeed, Newsletter, Settings, Feed Type Selection,
    // Connect X Account, Category Selection, Manage Profiles, Time Preferences.
    for (let i = 0; i < 7; i++) {
      await userEvent.click(screen.getByRole("button", { name: /next/i }));
    }
    expect(screen.getByText(/Step 8 of 8/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // Both the top-right X button (aria-label="Skip tutorial") and the
  // bottom text button ("Skip tutorial") share the same accessible name, so
  // getByRole would be ambiguous — disambiguate by DOM order: the X button
  // (calls onClose) renders first, the bottom link-style button (calls
  // onComplete) renders second.
  it("calls onClose when the top-right X button is clicked", async () => {
    const onClose = jest.fn();
    render(<TutorialOverlay {...makeProps({ onClose })} />);
    const [closeButton] = screen.getAllByRole("button", {
      name: /skip tutorial/i,
    });
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onComplete when the bottom 'Skip tutorial' link is clicked", async () => {
    const onComplete = jest.fn();
    render(<TutorialOverlay {...makeProps({ onComplete })} />);
    const [, skipLink] = screen.getAllByRole("button", {
      name: /skip tutorial/i,
    });
    await userEvent.click(skipLink);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("syncs to an externally controlled step and reports changes via onStepChange", async () => {
    const onStepChange = jest.fn();
    const { rerender } = render(
      <TutorialOverlay {...makeProps({ currentStep: 2, onStepChange })} />
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onStepChange).toHaveBeenCalledWith(3);

    rerender(<TutorialOverlay {...makeProps({ currentStep: 5, onStepChange })} />);
    expect(screen.getByText("Category Selection")).toBeInTheDocument();
  });

  // Regression test for a real infinite-render-loop bug: `tutorialSteps` used
  // to be a plain array literal rebuilt inside the component body on every
  // render, and it sat in the positioning `useEffect`'s dependency list.
  // Once a matching `[data-tutorial='...']` target existed in the DOM, the
  // effect's `setTooltipStyle`/`setTargetElement` calls triggered a
  // re-render, which recreated `tutorialSteps` as a new array reference,
  // which the dependency check saw as "changed", re-running the effect —
  // forever (this pegged a CPU core indefinitely in this suite before the
  // fix; not caught by React's "Maximum update depth" guard since it's an
  // effect-scheduled loop, not a synchronous render-phase one). Fixed by
  // hoisting `tutorialSteps` to a module-level constant. This test renders a
  // real matching target element — the exact condition that used to hang —
  // and asserts the render actually settles.
  it("positions the tooltip against a real target element without hanging", async () => {
    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "newsfeed");
    target.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 100,
      left: 100,
      right: 200,
      bottom: 150,
      width: 100,
      height: 50,
    });
    document.body.appendChild(target);

    render(<TutorialOverlay {...makeProps()} />);

    expect(screen.getByText("Newsfeed")).toBeInTheDocument();
    expect(target.classList.contains("tutorial-highlight")).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Newsletter")).toBeInTheDocument();
    // The previous step's target should be un-highlighted on advance.
    expect(target.classList.contains("tutorial-highlight")).toBe(false);

    document.body.removeChild(target);
  });
});
