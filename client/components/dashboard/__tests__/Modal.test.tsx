import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <Modal isOpen={false} message="hi" onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message when open", () => {
    render(<Modal isOpen={true} message="Are you sure?" onClose={jest.fn()} />);
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onClose when OK is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<Modal isOpen={true} message="msg" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm after onClose when provided", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(
      <Modal isOpen={true} message="msg" onClose={onClose} onConfirm={onConfirm} />
    );
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onConfirm is not provided", async () => {
    const user = userEvent.setup();
    render(<Modal isOpen={true} message="msg" onClose={jest.fn()} />);
    await user.click(screen.getByRole("button", { name: "OK" }));
  });
});
