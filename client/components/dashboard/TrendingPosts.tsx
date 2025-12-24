import Image from "next/image";
import { Post } from "./types";
import { Avatar } from "./Avatar";
import { timeAgo } from "./utils";

interface TrendingPostsProps {
  posts: Post[];
  loadingPosts: boolean;
}

export const TrendingPosts = ({ posts, loadingPosts }: TrendingPostsProps) => {
  const isExternalUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  if (loadingPosts) {
    return (
      <div className="mb-8 mx-1">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="mr-2">🔥</span> Trending Posts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="trending-card-skeleton rounded-xl border border-gray-800 bg-[#111] overflow-hidden"
            >
              <div className="h-32 bg-gray-800 animate-pulse"></div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 animate-pulse"></div>
                  <div className="h-4 w-24 rounded bg-gray-800 animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 rounded bg-gray-800 animate-pulse"></div>
                  <div className="h-4 w-16 rounded bg-gray-800 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fourHoursAgo = new Date().getTime() - 4 * 60 * 60 * 1000;
  const recentPosts = posts.filter(
    (post) => new Date(post.time).getTime() >= fourHoursAgo
  );

  // Pick top-liked post per unique account (max 5 posts)
  const uniqueTopPosts = [];
  const seenUsernames = new Set();

  for (const post of recentPosts.sort((a, b) => b.likes - a.likes)) {
    if (!seenUsernames.has(post.username)) {
      uniqueTopPosts.push(post);
      seenUsernames.add(post.username);
    }
    if (uniqueTopPosts.length === 5) break;
  }

  if (uniqueTopPosts.length === 0) {
    return (
      <div className="mb-8 mx-1">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="mr-2">🔥</span> Trending Posts
        </h2>
        <p className="text-gray-400">No trending posts</p>
      </div>
    );
  }

  return (
    <div className="mb-8 mx-1">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🔥</span> Trending Posts
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {uniqueTopPosts.map((post) => (
          <div
            key={post.tweet_id}
            className="relative trending-card rounded-xl border border-[#7FFFD4] bg-[#111] overflow-hidden hover:border-[#7FFFD4]/30 transition-all"
          >
            {post.mediaThumbnail || post.videoThumbnail ? (
              <div className="h-32 overflow-hidden">
                {(() => {
                  const mediaUrl =
                    post.mediaThumbnail ||
                    post.videoThumbnail ||
                    "/placeholder.svg";
                  const isExternalMedia = isExternalUrl(mediaUrl);

                  if (isExternalMedia) {
                    return (
                      <img
                        src={mediaUrl}
                        alt="Tweet media"
                        width={300}
                        height={128}
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    );
                  } else {
                    return (
                      <Image
                        src={mediaUrl}
                        alt="Tweet media"
                        width={300}
                        height={128}
                        className="object-cover w-full h-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                        priority={false}
                        loading="lazy"
                        unoptimized={true}
                      />
                    );
                  }
                })()}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center p-4">
                <p className="text-sm line-clamp-4 text-center">{post.text}</p>
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Avatar
                  username={post.username}
                  avatar={post.avatar || "/placeholder.svg"}
                  size="small"
                />
                <span className="text-sm font-medium truncate">
                  @{post.username}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#7FFFD4]">
                  {timeAgo(post.time)}
                </span>
                <a
                  href={`https://twitter.com/i/web/status/${post.tweet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#7FFFD4] hover:underline"
                  onClick={async () => {
                    const token = localStorage.getItem("token");
                    if (token) {
                      try {
                        await fetch(
                          `${process.env.NEXT_PUBLIC_SERVER}/logLinkClick`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              link: `https://twitter.com/i/web/status/${post.tweet_id}`,
                              page: window.location.pathname,
                            }),
                          }
                        );
                      } catch (error) {
                        // Silently fail
                      }
                    }
                  }}
                >
                  View Post
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
