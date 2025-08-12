import { X, MessageCircle } from "lucide-react";
import { ChatMessage } from "./types";

interface ChatModalProps {
  isChatOpen: boolean;
  chatMessages: ChatMessage[];
  userInput: string;
  isTyping: boolean;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onResetChat: () => void;
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

export const ChatModal = ({
  isChatOpen,
  chatMessages,
  userInput,
  isTyping,
  onClose,
  onInputChange,
  onSendMessage,
  onResetChat,
  chatContainerRef,
}: ChatModalProps) => {
  if (!isChatOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] rounded-lg w-full max-w-lg mx-auto overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-[#7FFFD4]">
            Ask FeedRecap AI
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-yellow-400 text-sm mb-2">
            Warning: Responses will be based on your followed profiles posts
            from last 24 hours
          </p>
          <div
            ref={chatContainerRef}
            className="chat-messages space-y-4 max-h-[50vh] overflow-y-auto mb-4"
          >
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-[#7FFFD4] text-black"
                      : "bg-gray-800 text-white"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-white rounded-lg p-3">
                  <span className="typing-animation">...</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
              placeholder="Ask a question..."
              className="w-full rounded-lg border border-gray-800 bg-black px-4 py-2 text-white placeholder-gray-400 focus:border-[#7FFFD4] focus:outline-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={onSendMessage}
                className="flex-1 rounded-lg bg-[#7FFFD4] px-4 py-2 text-black transition-colors hover:bg-[#00CED1]"
              >
                Send
              </button>
              <button
                onClick={onResetChat}
                className="flex-1 rounded-lg border border-[#7FFFD4] px-4 py-2 text-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 right-6 bg-[#7FFFD4] text-black p-4 rounded-full shadow-lg hover:bg-[#00CED1] transition-colors"
  >
    <MessageCircle size={24} />
  </button>
);
