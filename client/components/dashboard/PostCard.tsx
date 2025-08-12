import { Post, FeedType } from "./types";
import { Avatar } from "./Avatar";
import { MediaRenderer } from "./MediaRenderer";
import { QuotedTweet } from "./QuotedTweet";
import { formatTime } from "./utils";

interface PostCardProps {
  post: Post;
  wise: FeedType;
  expandedPosts: { [key: string]: boolean };
  onToggleExpansion: (tweetId: string) => void;
}

export const PostCard = ({
  post,
  wise,
  expandedPosts,
  onToggleExpansion,
}: PostCardProps) => {
  const renderPostText = (text: string, tweetId: string) => {
    const shouldTruncate = text.length > 250;
    const isExpanded = expandedPosts[tweetId];

    if (!shouldTruncate) {
      return <p className="mb-4">{text}</p>;
    }

    return (
      <div>
        <p className="mb-2">{isExpanded ? text : `${text.slice(0, 250)}...`}</p>
        <button
          onClick={() => onToggleExpansion(tweetId)}
          className="text-sm text-[#7FFFD4] hover:underline"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </button>
      </div>
    );
  };

  const handlePostClick = (e: React.MouseEvent, tweetId: string) => {
    e.preventDefault();
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    if (isMobile) {
      // Try opening in X app directly (NO confirmation prompt)
      window.location.href = `twitter://status?id=${tweetId}`;

      // If app is not installed, open in browser after a short delay
      setTimeout(() => {
        window.location.href = `https://twitter.com/i/web/status/${tweetId}`;
      }, 500);
    } else {
      // Desktop: Always open in a new tab
      window.open(`https://twitter.com/i/web/status/${tweetId}`, "_blank");
    }
  };

  return (
    <div className="post-card break-inside-avoid mb-4 overflow-hidden rounded-xl border border-gray-800 bg-[#111] p-4 transition-all hover:border-[#7FFFD4]/30">
      <div className="post-header mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            username={post.username}
            avatar={post.avatar || "/placeholder.svg"}
            size="large"
          />
          <div>
            <h3 className="font-medium">@{post.username}</h3>
            <span className="text-sm text-gray-400">
              {formatTime(post.time)}
            </span>
          </div>
        </div>
        {wise === "categorywise" && (
          <span className="rounded-full bg-[#7FFFD4]/10 px-3 py-1 text-sm text-[#7FFFD4]">
            {post.category}
          </span>
        )}
      </div>

      {renderPostText(post.text, post.tweet_id)}
      <MediaRenderer post={post} />
      {post.quotedTweet && <QuotedTweet quotedTweet={post.quotedTweet} />}

      <a
        href={`https://twitter.com/i/web/status/${post.tweet_id}`}
        onClick={(e) => handlePostClick(e, post.tweet_id)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[#7FFFD4] hover:underline"
      >
        View Post
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
    </div>
  );
};
