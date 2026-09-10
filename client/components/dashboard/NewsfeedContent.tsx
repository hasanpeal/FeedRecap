import { useEffect, useState } from "react";
import { Post, FeedType, SortBy, SortOrder } from "./types";
import { TrendingPosts } from "./TrendingPosts";
import { FilterBar } from "./FilterBar";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "./SkeletonLoader";

interface NewsfeedContentProps {
  posts: Post[];
  loadingPosts: boolean;
  trendingPosts: Post[];
  loadingTrending: boolean;
  wise: FeedType;
  categories: string[];
  profiles: any[];
  selectedCategory: string | null;
  selectedProfile: string | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
  expandedPosts: { [key: string]: boolean };
  onCategorySelect: (category: string | null) => void;
  onProfileSelect: (profile: string | null) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  onToggleExpansion: (tweetId: string) => void;
  profilesContainerRef: React.RefObject<HTMLDivElement>;
  scrollProfiles: (direction: "left" | "right") => void;
  bookmarkedTweetIds?: Set<string>;
  onToggleBookmark?: (post: Post) => void;
  hasMorePosts?: boolean;
  loadingMorePosts?: boolean;
  onLoadMore?: () => void;
}

// Mirrors the md/lg Tailwind breakpoints previously used for grid-cols.
function useResponsiveColumnCount() {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const updateColumnCount = () => {
      if (window.innerWidth >= 1024) setColumnCount(3);
      else if (window.innerWidth >= 768) setColumnCount(2);
      else setColumnCount(1);
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  return columnCount;
}

// Round-robin distribution keeps left-to-right reading order and, since an
// item's column only depends on its own index, appending more items never
// moves items already on screen into a different column.
function distributeIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

export const NewsfeedContent = ({
  posts,
  loadingPosts,
  trendingPosts,
  loadingTrending,
  wise,
  categories,
  profiles,
  selectedCategory,
  selectedProfile,
  sortBy,
  sortOrder,
  expandedPosts,
  onCategorySelect,
  onProfileSelect,
  onSortByChange,
  onSortOrderChange,
  onToggleExpansion,
  profilesContainerRef,
  scrollProfiles,
  bookmarkedTweetIds,
  onToggleBookmark,
  hasMorePosts,
  loadingMorePosts,
  onLoadMore,
}: NewsfeedContentProps) => {
  // Filtering and sorting now happen server-side (see fetchData/fetchMorePosts
  // in dashboard/page.tsx) so `posts` already reflects the current page.
  const filteredPosts = posts;
  const columnCount = useResponsiveColumnCount();

  const isEmpty = filteredPosts.length === 0;
  const isLoading = loadingPosts || (isEmpty && posts.length === 0);

  const postColumns = isLoading ? [] : distributeIntoColumns(filteredPosts, columnCount);
  const skeletonColumns = isLoading
    ? distributeIntoColumns(Array.from({ length: 6 }), columnCount)
    : [];

  return (
    <div className="newsfeed-content">
      <TrendingPosts posts={trendingPosts} loadingPosts={loadingTrending} />

      <FilterBar
        wise={wise}
        categories={categories}
        profiles={profiles}
        selectedCategory={selectedCategory}
        selectedProfile={selectedProfile}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onCategorySelect={onCategorySelect}
        onProfileSelect={onProfileSelect}
        onSortByChange={onSortByChange}
        onSortOrderChange={onSortOrderChange}
        profilesContainerRef={profilesContainerRef}
        scrollProfiles={scrollProfiles}
      />

      {isLoading ? (
        <div className="flex gap-4">
          {skeletonColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-1 flex-col gap-4">
              {column.map((_, itemIndex) => (
                <PostSkeleton key={itemIndex} />
              ))}
            </div>
          ))}
        </div>
      ) : !isEmpty ? (
        <div className="flex gap-4">
          {postColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-1 flex-col gap-4">
              {column.map((post) => (
                <PostCard
                  key={post.tweet_id}
                  post={post}
                  wise={wise}
                  expandedPosts={expandedPosts}
                  onToggleExpansion={onToggleExpansion}
                  isBookmarked={bookmarkedTweetIds?.has(post.tweet_id)}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No posts found.</p>
        </div>
      )}

      {!loadingPosts && hasMorePosts && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMore}
            disabled={loadingMorePosts}
            className="min-w-[8.5rem] rounded-full px-6 py-2 text-sm font-medium border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMorePosts ? (
              <span className="flex items-center justify-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#7FFFD4] animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#7FFFD4] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#7FFFD4] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            ) : (
              "Show More"
            )}
          </button>
        </div>
      )}
    </div>
  );
};
