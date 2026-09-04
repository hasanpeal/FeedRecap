import { Bookmark as BookmarkIcon, ExternalLink, Trash2 } from "lucide-react";
import { Bookmark } from "./types";
import { formatTime } from "./utils";

interface BookmarksSectionProps {
  bookmarks: Bookmark[];
  loadingBookmarks: boolean;
  onRemoveBookmark: (tweetId: string) => void;
}

export const BookmarksSection = ({
  bookmarks,
  loadingBookmarks,
  onRemoveBookmark,
}: BookmarksSectionProps) => {
  const handleOpenPost = (link: string) => {
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const tweetId = link.split("/").pop();

    if (isMobile && tweetId) {
      window.location.href = `twitter://status?id=${tweetId}`;
      setTimeout(() => {
        window.location.href = link;
      }, 500);
    } else {
      window.open(link, "_blank");
    }
  };

  if (loadingBookmarks) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-xl border border-gray-800 bg-[#111]"
          />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <BookmarkIcon className="h-10 w-10 text-gray-600" />
        <p className="text-gray-400">
          No bookmarks yet. Tap the bookmark icon on a post to save it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.tweetId}
          className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-[#111] p-4"
        >
          <div className="min-w-0">
            {bookmark.username && (
              <h3 className="font-medium">@{bookmark.username}</h3>
            )}
            <p className="truncate text-sm text-gray-400">{bookmark.link}</p>
            <span className="text-xs text-gray-600">
              Saved {formatTime(bookmark.createdAt)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleOpenPost(bookmark.link)}
              aria-label="Open post"
              className="rounded-full p-2 text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
            <button
              onClick={() => onRemoveBookmark(bookmark.tweetId)}
              aria-label="Remove bookmark"
              className="rounded-full p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
