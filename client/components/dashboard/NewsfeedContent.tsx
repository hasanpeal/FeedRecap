import { Post, FeedType, SortBy, SortOrder } from "./types";
import { TrendingPosts } from "./TrendingPosts";
import { FilterBar } from "./FilterBar";
import { PostCard } from "./PostCard";
import { PostSkeleton } from "./SkeletonLoader";

interface NewsfeedContentProps {
  posts: Post[];
  loadingPosts: boolean;
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
}

export const NewsfeedContent = ({
  posts,
  loadingPosts,
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
}: NewsfeedContentProps) => {
  const filteredPosts = posts
    .filter(
      (post) =>
        (selectedCategory ? post.category === selectedCategory : true) &&
        (selectedProfile ? post.username === selectedProfile : true)
    )
    .sort((a, b) => {
      if (sortBy === "time") {
        return sortOrder === "desc"
          ? new Date(b.time).getTime() - new Date(a.time).getTime()
          : new Date(a.time).getTime() - new Date(b.time).getTime();
      } else {
        return sortOrder === "desc" ? b.likes - a.likes : a.likes - b.likes;
      }
    });

  return (
    <div className="newsfeed-content">
      <TrendingPosts posts={posts} loadingPosts={loadingPosts} />

      <FilterBar
        wise={wise}
        categories={categories}
        profiles={profiles}
        posts={posts}
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

      <div className="sm:masonry-grid columns-1 md:columns-2 lg:columns-3 gap-4">
        {loadingPosts || (filteredPosts.length === 0 && posts.length === 0) ? (
          Array.from({ length: 6 }).map((_, index) => (
            <PostSkeleton key={index} />
          ))
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard
              key={post.tweet_id}
              post={post}
              wise={wise}
              expandedPosts={expandedPosts}
              onToggleExpansion={onToggleExpansion}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-400">No posts found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
