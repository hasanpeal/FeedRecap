import { Notification as NotificationType } from "./types";

interface NotificationProps {
  notification: NotificationType | null;
}

export const Notification = ({ notification }: NotificationProps) => {
  if (!notification) return null;

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg ${
        notification.type === "success"
          ? "bg-[#7FFFD4] text-black"
          : "bg-red-500 text-white"
      }`}
    >
      {notification.message}
    </div>
  );
};
