import Image from "next/image";
import { getInitials } from "./utils";

interface AvatarProps {
  username: string;
  avatar: string;
  size?: "small" | "large";
}

export const Avatar = ({ username, avatar, size = "small" }: AvatarProps) => {
  const isLarge = size === "large";
  const dimensions = isLarge ? 40 : 24;
  const className = isLarge ? "w-10 h-10" : "w-6 h-6";
  const textSize = isLarge ? "text-sm" : "text-xs";
  const initials = getInitials(username);

  const hasValidAvatar = Boolean(avatar && avatar !== "/placeholder.svg");
  const isExternalUrl =
    hasValidAvatar &&
    (avatar.startsWith("http://") || avatar.startsWith("https://"));

  if (hasValidAvatar) {
    if (isExternalUrl) {
      // Use regular img tag for external URLs to avoid Next.js image optimization issues
      return (
        <div className={`inline-flex items-center justify-center ${className}`}>
          <img
            src={avatar}
            alt={username}
            width={dimensions}
            height={dimensions}
            className={`rounded-full ${className}`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div
            className={`hidden ${className} bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold ${textSize}`}
          >
            {initials}
          </div>
        </div>
      );
    } else {
      // Use Next.js Image for internal/local images
      return (
        <div className={`inline-flex items-center justify-center ${className}`}>
          <Image
            src={avatar}
            alt={username}
            width={dimensions}
            height={dimensions}
            className={`rounded-full ${className}`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div
            className={`hidden ${className} bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold ${textSize}`}
          >
            {initials}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      className={`${className} bg-[#7FFFD4]/20 rounded-full flex items-center justify-center text-[#7FFFD4] font-bold ${textSize}`}
    >
      {initials}
    </div>
  );
};
