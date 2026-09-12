import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatModal, ChatButton } from "../ChatModal";
import { ChatMessage } from "../types";

function baseProps(overrides: Partial<Parameters<typeof ChatModal>[0]> = {}) {
  return {
    isChatOpen: true,
    chatMessages: [] as ChatMessage[],
    userInput: "",
    isTyping: false,
    onClose: jest.fn(),
    onInputChange: jest.fn(),
    onSendMessage: jest.fn(),
    onResetChat: jest.fn(),
    chatContainerRef: createRef<HTMLDivElement>(),
    ...overrides,
  };
}

describe("ChatModal", () => {
  it("renders nothing when isChatOpen is false", () => {
    const { container } = render(
      <ChatModal {...baseProps({ isChatOpen: false })} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders user and assistant messages with distinct styling", () => {
    render(
      <ChatModal
        {...baseProps({
          chatMessages: [
            { role: "user", content: "hi" },
            { role: "assistant", content: "hello" },
          ],
        })}
      />
    );
    expect(screen.getByText("hi")).toHaveClass("bg-[#7FFFD4]");
    expect(screen.getByText("hello")).toHaveClass("bg-gray-800");
  });

  it("shows a typing indicator when isTyping is true", () => {
    render(<ChatModal {...baseProps({ isTyping: true })} />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("calls onInputChange as the user types", async () => {
    const user = userEvent.setup();
    const onInputChange = jest.fn();
    render(<ChatModal {...baseProps({ onInputChange })} />);
    const input = screen.getByPlaceholderText("Ask a question...");
    await user.type(input, "a");
    expect(onInputChange).toHaveBeenCalledWith("a");
  });

  it("calls onSendMessage when the Enter key is pressed in the input", async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn();
    render(
      <ChatModal {...baseProps({ userInput: "hello", onSendMessage })} />
    );
    const input = screen.getByPlaceholderText("Ask a question...");
    await user.type(input, "{Enter}");
    expect(onSendMessage).toHaveBeenCalled();
  });

  it("calls onSendMessage and onResetChat from their buttons", async () => {
    const user = userEvent.setup();
    const onSendMessage = jest.fn();
    const onResetChat = jest.fn();
    render(<ChatModal {...baseProps({ onSendMessage, onResetChat })} />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(onResetChat).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close (X) button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { container } = render(<ChatModal {...baseProps({ onClose })} />);
    const closeBtn = container.querySelector(
      "button.text-gray-400"
    ) as HTMLButtonElement;
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ChatButton", () => {
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<ChatButton onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
