interface ModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
}

export const Modal = ({ isOpen, message, onClose, onConfirm }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-[#111] rounded-lg w-full max-w-md mx-auto overflow-hidden shadow-lg">
        <div className="p-6 text-center">
          <p className="text-white text-lg">{message}</p>
        </div>
        <div className="border-t border-gray-700 p-4 text-center">
          <button
            className="bg-[#7FFFD4] text-black px-6 py-2 rounded-lg transition hover:bg-[#00CED1]"
            onClick={() => {
              onClose();
              if (onConfirm) onConfirm();
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
