export const formatTime = (date: string | number | Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };
  return new Date(date).toLocaleTimeString("en-US", options);
};

// "Today at 3:45 PM" / "Yesterday at 10:12 AM" / "03/03/2023 at 10:12 AM"
export const formatPostDate = (date: string | number | Date): string => {
  const postDate = new Date(date);
  const now = new Date();

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(postDate)) / (1000 * 60 * 60 * 24)
  );

  const time = postDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;

  const dateStr = postDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  return `${dateStr} at ${time}`;
};

export const timeAgo = (date: string | number | Date) => {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  let interval = Math.floor(seconds / 31536000);

  if (interval >= 1)
    return interval + " year" + (interval > 1 ? "s" : "") + " ago";
  if ((interval = Math.floor(seconds / 2592000)) >= 1)
    return interval + " month" + (interval > 1 ? "s" : "") + " ago";
  if ((interval = Math.floor(seconds / 86400)) >= 1)
    return interval + " day" + (interval > 1 ? "s" : "") + " ago";
  if ((interval = Math.floor(seconds / 3600)) >= 1)
    return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
  if ((interval = Math.floor(seconds / 60)) >= 1)
    return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
  return Math.floor(seconds) + " seconds ago";
};

export const getInitials = (username: string) => {
  return username
    .split(/[._-]/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const isIOS = () => {
  if (typeof navigator !== "undefined") {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
  return false;
};

export const playSound = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Create Oscillator
  const oscillator = audioCtx.createOscillator();
  oscillator.type = "sine"; // Smooth & natural tone
  oscillator.frequency.setValueAtTime(180, audioCtx.currentTime); // Low & soft tick

  // Create Gain Node for volume control
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); // Soft volume
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08); // Quick decay

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Start and stop the oscillator quickly for a haptic "tick"
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.08); // 80ms short sound
};
