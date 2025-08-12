import { Post } from "./types";
import { Avatar } from "./Avatar";
import { MediaRenderer } from "./MediaRenderer";
import { formatTime } from "./utils";

interface QuotedTweetProps {
  quotedTweet: Post["quotedTweet"];
}

export const QuotedTweet = ({ quotedTweet }: QuotedTweetProps) => {
  if (!quotedTweet || !quotedTweet.username) return null;

  // Create a post object from the quotedTweet to use with MediaRenderer
  const quotedPostForMedia: Post = {
    ...quotedTweet,
    username: quotedTweet.username,
    time: quotedTweet.createdAt.toString(),
    category: "",
    tweet_id: quotedTweet.tweet_id,
    text: quotedTweet.text,
    likes: quotedTweet.likes,
    avatar: quotedTweet.avatar,
  };

  return (
    <div className="mt-2 mb-4 rounded-lg border border-gray-700 p-3">
      <div className="mb-2 flex items-center gap-3">
        <Avatar
          username={quotedTweet.username}
          avatar={quotedTweet.avatar || "/placeholder.svg"}
          size="large"
        />
        <div>
          <h3 className="font-medium">@{quotedTweet.username}</h3>
          <span className="text-sm text-gray-400">
            {formatTime(quotedTweet.createdAt)}
          </span>
        </div>
      </div>
      <p className="mb-3">
        {quotedTweet && quotedTweet.text
          ? quotedTweet.text.length > 150
            ? `${quotedTweet.text.slice(0, 150)}...`
            : quotedTweet.text
          : ""}
      </p>
      <MediaRenderer post={quotedPostForMedia} />
    </div>
  );
};
