import { render, screen } from "@testing-library/react";
import { Notification } from "../Notification";

describe("Notification", () => {
  it("renders nothing when notification is null", () => {
    const { container } = render(<Notification notification={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a success notification with success styling", () => {
    render(
      <Notification notification={{ message: "Saved!", type: "success" }} />
    );
    const el = screen.getByText("Saved!");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("bg-[#7FFFD4]");
  });

  it("renders an error notification with error styling", () => {
    render(
      <Notification notification={{ message: "Failed!", type: "error" }} />
    );
    const el = screen.getByText("Failed!");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("bg-red-500");
  });
});
