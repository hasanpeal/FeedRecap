import { ChevronLeft, ChevronRight, MoveUp, MoveDown } from "lucide-react";
import { UserProfile, FeedType, SortBy, SortOrder } from "./types";
import { Avatar } from "./Avatar";

interface FilterBarProps {
  wise: FeedType;
  categories: string[];
  profiles: UserProfile[];
  posts: any[];
  selectedCategory: string | null;
  selectedProfile: string | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onCategorySelect: (category: string | null) => void;
  onProfileSelect: (profile: string | null) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  profilesContainerRef: React.RefObject<HTMLDivElement>;
  scrollProfiles: (direction: "left" | "right") => void;
}

export const FilterBar = ({
  wise,
  categories,
  profiles,
  posts,
  selectedCategory,
  selectedProfile,
  sortBy,
  sortOrder,
  onCategorySelect,
  onProfileSelect,
  onSortByChange,
  onSortOrderChange,
  profilesContainerRef,
  scrollProfiles,
}: FilterBarProps) => {
  return (
    <>
      <div className="relative mb-6">
        <button
          onClick={() => scrollProfiles("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-[#7FFFD4]" />
        </button>

        <div className="relative overflow-x-hidden ml-2 mr-2">
          <div
            ref={profilesContainerRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide whitespace-nowrap px-8"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {wise === "categorywise" ? (
              <>
                <button
                  onClick={() => onCategorySelect(null)}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    !selectedCategory
                      ? "bg-[#7FFFD4] text-black"
                      : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => onCategorySelect(category)}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === category
                        ? "bg-[#7FFFD4] text-black"
                        : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </>
            ) : (
              <>
                <button
                  onClick={() => onProfileSelect(null)}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    !selectedProfile
                      ? "bg-[#7FFFD4] text-black"
                      : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                  }`}
                >
                  All Profiles
                </button>
                {profiles
                  .filter((profile) =>
                    posts.some((post) => post.username === profile.username)
                  )
                  .map((profile) => (
                    <button
                      key={profile.username}
                      onClick={() => onProfileSelect(profile.username)}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap max-w-[200px] ${
                        selectedProfile === profile.username
                          ? "bg-[#7FFFD4] text-black"
                          : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
                      }`}
                    >
                      <Avatar
                        username={profile.username}
                        avatar={profile.avatar}
                        size="small"
                      />
                      <span className="ml-2 truncate">@{profile.username}</span>
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => scrollProfiles("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-[#7FFFD4]" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 mb-4">
        <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2 border border-gray-800">
          <span className="text-sm text-gray-400">Sort by:</span>
          <button
            onClick={() => onSortByChange("time")}
            className={`px-3 py-1 rounded-md text-sm ${
              sortBy === "time"
                ? "bg-[#7FFFD4] text-black"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            Time
          </button>
          <button
            onClick={() => onSortByChange("likes")}
            className={`px-3 py-1 rounded-md text-sm ${
              sortBy === "likes"
                ? "bg-[#7FFFD4] text-black"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            Likes
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[#111] rounded-lg p-2.5 border border-gray-800">
          <span className="text-sm text-gray-400">Order:</span>
          <button
            onClick={() => onSortOrderChange("desc")}
            className={`px-3 rounded-md text-sm ${
              sortOrder === "desc"
                ? "bg-[#7FFFD4] text-black"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <MoveDown width={10} />
          </button>
          <button
            onClick={() => onSortOrderChange("asc")}
            className={`px-3 rounded-md text-sm ${
              sortOrder === "asc"
                ? "bg-[#7FFFD4] text-black"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <MoveUp width={10} />
          </button>
        </div>
      </div>
    </>
  );
};
