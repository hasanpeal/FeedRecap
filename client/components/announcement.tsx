import { useState, useEffect } from "react";
import Link from "next/link";
import "./announcement.css";

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const announcementText = `📣 Call to Action: As Election Day nears, stay informed and engaged by following the political pulse on social media. Use this newsletter as a guide to the latest developments, but remember to verify information from multiple sources and critically evaluate the perspectives you encounter online. Your voice and your vote matter, so make your voice heard on November 5`;

  const [duration, setDuration] = useState(10); // Default animation duration

  // Calculate duration based on text length
  useEffect(() => {
    const calculatedDuration = Math.max(15, announcementText.length / 10); // Adjust this divisor for speed control
    setDuration(calculatedDuration);

    // Set the body margin when the announcement is visible
    if (isVisible) {
      document.body.style.marginTop = "40px"; // Adjust based on the height of the announcement bar
    }
  }, [announcementText, isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);

    // Remove the body margin when the announcement is dismissed
    document.body.style.marginTop = "0px";
  };

  if (!isVisible) return null;

  return (
    <div className="announcement-bar bg-yellow-400 text-black py-2 flex justify-between items-center px-6">
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <p
          className="animate-marquee"
          style={{ animationDuration: `${duration}s` }} // Dynamically adjust animation speed
        >
          {announcementText}&nbsp;
          <Link href="/signup">
            <span className="underline font-bold">Sign up now!</span>
          </Link>
        </p>
      </div>
      <button className="ml-4 text-black font-semibold" onClick={handleDismiss}>
        ✖
      </button>
    </div>
  );
}
