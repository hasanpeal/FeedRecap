import { Loader2, Check, UserPlus, X } from "lucide-react";
import { XLogo } from "./XLogo";
import { Avatar } from "./Avatar";
import { FeedType, UserProfile, TwitterAccount } from "./types";

const MAX_CUSTOM_PROFILES = 10;

interface SettingsSectionProps {
  wise: FeedType;
  setWise: (wise: FeedType) => void;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  profiles: UserProfile[];
  setProfiles: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  time: string[];
  setTime: React.Dispatch<React.SetStateAction<string[]>>;
  linkedTwitter: string | null;
  twitterUsername: string;
  setTwitterUsername: (username: string) => void;
  twitterFollowing: TwitterAccount[];
  selectedTwitterAccounts: string[];
  setSelectedTwitterAccounts: React.Dispatch<React.SetStateAction<string[]>>;
  showTwitterFollowing: boolean;
  setShowTwitterFollowing: (show: boolean) => void;
  unsavedProfiles: boolean;
  registeredWise: string;
  loading: boolean;
  isConnectingTwitter: boolean;
  isLoadingMoreProfiles: boolean;
  isSavingTwitter: boolean;
  showSettingInfo: string | null;
  setShowSettingInfo: (info: string | null) => void;
  onFeedTypeUpdate: () => void;
  onCategoryUpdate: () => void;
  onProfileUpdate: () => void;
  onTimeUpdate: () => void;
  onConnectTwitter: () => void;
  onUnlinkTwitter: () => void;
  onShowFollowedProfiles: () => void;
  onAddSelectedAccounts: () => void;
  onSelectTwitterAccount: (screenName: string) => void;
  onAddProfile: (suggestion: string) => void;
  onRemoveProfile: (username: string) => void;
  onSearchInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTwitterUsernameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  newProfile: string;
  suggestions: string[];
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  loadingSuggestions: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  twitterDropdownRef: React.RefObject<HTMLDivElement>;
  // Twitter suggestions
  twitterSuggestions: string[];
  showTwitterSuggestions: boolean;
  setShowTwitterSuggestions: (show: boolean) => void;
  loadingTwitterSuggestions: boolean;
  twitterSuggestionsRef: React.RefObject<HTMLDivElement>;
}

const availableCategories = [
  "Politics",
  "Geopolitics",
  "Finance",
  "AI",
  "Tech",
  "Crypto",
  "Meme",
  "Sports",
  "Entertainment",
];

const availableTimes = ["Morning", "Afternoon", "Night"];

const renderSettingInfo = (\n  setting: string,\n  showSettingInfo: string | null,\n  onClose: () => void\n) => {
  const infoContent = {
    "feed-type":
      'Choose how your feed is organized. "Categories" shows content organized by topics like Tech, Finance, AI etc. "Profiles" shows content from specific accounts you follow',
    "twitter-connect":
      "Connect your X/Twitter account to easily import profiles you already follow. This saves you time from manually adding each profile",
    categories:
      "Select the topics you want to see in your feed. Your feed will prioritize content from these categories",
    "profiles-manage":
      "Add or remove specific accounts to follow. You can search for profiles or import them from your X/Twitter account",
    "time-settings":
      "Choose when you'd like to receive your newsletter: Morning (after 9 AM ET), Afternoon (after 3 PM ET), or Night (after 8 PM ET)",
  };

  if (!showSettingInfo || showSettingInfo !== setting) return null;

  return (
    <div className="relative mt-2 rounded-lg border border-[#7FFFD4] bg-[#111] p-3 pr-9 text-sm text-white">
      {infoContent[setting as keyof typeof infoContent]}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 text-gray-400 transition-colors hover:text-white"
        aria-label="Close setting information"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const SettingsSection = ({
  wise,
  setWise,
  categories,
  setCategories,
  profiles,
  setProfiles,
  time,
  setTime,
  linkedTwitter,
  twitterUsername,
  setTwitterUsername,
  twitterFollowing,
  selectedTwitterAccounts,
  setSelectedTwitterAccounts,
  showTwitterFollowing,
  setShowTwitterFollowing,
  unsavedProfiles,
  registeredWise,
  loading,
  isConnectingTwitter,
  isLoadingMoreProfiles,
  isSavingTwitter,
  showSettingInfo,
  setShowSettingInfo,
  onFeedTypeUpdate,
  onCategoryUpdate,
  onProfileUpdate,
  onTimeUpdate,
  onConnectTwitter,
  onUnlinkTwitter,
  onShowFollowedProfiles,
  onAddSelectedAccounts,
  onSelectTwitterAccount,
  onAddProfile,
  onRemoveProfile,
  onSearchInputChange,
  onTwitterUsernameChange,
  newProfile,
  suggestions,
  showDropdown,
  setShowDropdown,
  loadingSuggestions,
  dropdownRef,
  twitterDropdownRef,
  // Twitter suggestions
  twitterSuggestions,
  showTwitterSuggestions,
  setShowTwitterSuggestions,
  loadingTwitterSuggestions,
  twitterSuggestionsRef,
}: SettingsSectionProps) => {
  return (
    <div className="settings-content space-y-6 rounded-xl border border-gray-800 bg-[#111] p-4 sm:space-y-8 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-white sm:text-2xl">Newsletter Settings</h1>
        <p className="mt-1 text-xs text-gray-400 sm:text-sm">Choose what you want to receive, then pick when you want it delivered.</p>
      </div>
      {/* Feed Type Selection */}
      <section className="space-y-3 border-t border-gray-800 pt-4 sm:space-y-4 sm:pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#7FFFD4] sm:text-xl">1. Choose your feed</h2>
          <button
            onClick={() => setShowSettingInfo("feed-type")}
            className="text-[#7FFFD4] hover:text-white transition-colors"
            aria-label="Show feed type information"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
        </div>
        {renderSettingInfo("feed-type", showSettingInfo)}
        <div className="flex gap-2 sm:gap-4">
          <button
            className={`rounded-full px-4 py-1.5 text-sm transition-colors sm:px-6 sm:py-2 sm:text-base ${
              wise === "categorywise"
                ? "bg-[#7FFFD4] text-black"
                : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
            }`}
            onClick={() => setWise("categorywise")}
          >
            Categories
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm transition-colors sm:px-6 sm:py-2 sm:text-base ${
              wise === "customProfiles"
                ? "bg-[#7FFFD4] text-black"
                : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
            }`}
            onClick={() => setWise("customProfiles")}
          >
            Profiles
          </button>
        </div>
        <button
          className="mt-3 rounded-full bg-black px-6 py-1.5 text-sm text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black sm:mt-4 sm:px-14 sm:py-2 sm:text-base"
          onClick={onFeedTypeUpdate}
          disabled={loading}
        >
          {loading ? "Updating..." : (
            <>
              <span className="sm:hidden">Update</span>
              <span className="hidden sm:inline">Update Feed Type</span>
            </>
          )}
        </button>
      </section>

      {/* Twitter Integration Section */}
      {wise === "customProfiles" && <section className="space-y-3 border-t border-gray-800 pt-4 sm:space-y-4 sm:pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#7FFFD4] sm:text-xl">
            2. Choose X profiles
          </h2>
          <button
            onClick={() => setShowSettingInfo("twitter-connect")}
            className="text-[#7FFFD4] hover:text-white transition-colors"
            aria-label="Show Twitter connect information"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
        </div>
        {renderSettingInfo("twitter-connect", showSettingInfo)}

        {linkedTwitter ? (
          <>
            <p className="text-sm text-gray-400 sm:text-base">
              Connected as <strong>@{linkedTwitter}</strong>
            </p>
            <div className="flex gap-2 sm:gap-4">
              <button
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-600 sm:px-4 sm:py-2 sm:text-base"
                onClick={onUnlinkTwitter}
                disabled={loading}
              >
                {loading ? "Unlinking..." : "Unlink"}
              </button>
              <button
                className="rounded-lg bg-black px-3 py-1.5 text-sm text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black sm:px-4 sm:py-2 sm:text-base"
                onClick={onShowFollowedProfiles}
                disabled={isLoadingMoreProfiles}
              >
                {isLoadingMoreProfiles ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Show Followed Profiles"
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={twitterUsername}
                  onChange={onTwitterUsernameChange}
                  placeholder="@YourUsername"
                  className="w-full rounded-lg border border-gray-800 bg-black px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-[#7FFFD4] focus:outline-none sm:px-4 sm:py-2 sm:text-base"
                  disabled={isConnectingTwitter}
                />
                {showTwitterSuggestions && (
                  <div
                    ref={twitterSuggestionsRef}
                    className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-gray-800 bg-black z-10"
                  >
                    <div className="flex justify-between items-center p-2 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Suggestions</span>
                      <button
                        onClick={() => setShowTwitterSuggestions(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <ul className="list-none">
                      {loadingTwitterSuggestions ? (
                        <li className="p-2 text-gray-400">Loading...</li>
                      ) : twitterSuggestions.length > 0 ? (
                        twitterSuggestions.map((suggestion, index) => (
                          <li
                            key={index}
                            className="cursor-pointer p-2 hover:bg-[#7FFFD4]/10"
                            onClick={() => {
                              setTwitterUsername(suggestion);
                              setShowTwitterSuggestions(false);
                            }}
                          >
                            @{suggestion}
                          </li>
                        ))
                      ) : (
                        <li className="p-2 text-gray-400">No result found</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <button
                className="rounded-lg bg-black px-3 py-1.5 text-sm text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black flex items-center justify-center gap-2 sm:px-4 sm:py-2 sm:text-base"
                onClick={onConnectTwitter}
                disabled={isConnectingTwitter || !twitterUsername}
              >
                {isConnectingTwitter ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <XLogo size={16} className="text-[#7FFFD4]" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Show Followed Profiles UI when connected */}
        {showTwitterFollowing && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-[#7FFFD4]">
                Select accounts to add ({selectedTwitterAccounts.length}{" "}
                selected)
              </h3>
              <button
                className="text-sm text-gray-400 hover:text-white"
                onClick={() => setShowTwitterFollowing(false)}
              >
                Cancel
              </button>
            </div>

            {isLoadingMoreProfiles && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#7FFFD4] mr-2"></div>
                <span className="text-[#7FFFD4]">Loading more profiles...</span>
              </div>
            )}

            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-800 bg-black p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {twitterFollowing.map((account) => (
                  <div
                    key={account.screen_name}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTwitterAccounts.includes(account.screen_name)
                        ? "bg-[#7FFFD4]/20 border border-[#7FFFD4]"
                        : "hover:bg-gray-900 border border-gray-800"
                    }`}
                    onClick={() => onSelectTwitterAccount(account.screen_name)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        username={account.screen_name}
                        avatar={account.profile_image || "/placeholder.svg"}
                        size="large"
                      />
                      {selectedTwitterAccounts.includes(
                        account.screen_name
                      ) && (
                        <div className="absolute -right-1 -bottom-1 bg-[#7FFFD4] rounded-full p-0.5">
                          <Check size={12} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-medium truncate">{account.name}</div>
                      <div className="text-sm text-gray-400 truncate">
                        @{account.screen_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {twitterFollowing.length} accounts loaded
              </div>
              <button
                className="w-full md:w-auto rounded-lg bg-[#7FFFD4] px-4 py-2 text-black transition-colors hover:bg-[#7FFFD4]/90 flex items-center justify-center gap-2"
                onClick={onAddSelectedAccounts}
                disabled={selectedTwitterAccounts.length === 0}
              >
                <UserPlus size={16} />
                Add {selectedTwitterAccounts.length} Selected Account
                {selectedTwitterAccounts.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

      </section>}

      {/* 2. Choose topics Section */}
      {wise === "categorywise" && <section className="space-y-3 border-t border-gray-800 pt-4 sm:space-y-4 sm:pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#7FFFD4] sm:text-xl">
            2. Choose topics
          </h2>
          <button
            onClick={() => setShowSettingInfo("categories")}
            className="text-[#7FFFD4] hover:text-white transition-colors"
            aria-label="Show categories information"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
        </div>
        {renderSettingInfo("categories", showSettingInfo)}

        <div className="flex flex-wrap gap-2">
          {availableCategories.map((category) => (
            <button
              key={category}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                categories.includes(category)
                  ? "bg-[#7FFFD4] text-black"
                  : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
              }`}
              onClick={() =>
                setCategories((prev) =>
                  prev.includes(category)
                    ? prev.filter((c) => c !== category)
                    : [...prev, category]
                )
              }
              disabled={loading || wise === "customProfiles"}
            >
              {category}
            </button>
          ))}
        </div>
        {wise === "categorywise" && registeredWise === "categorywise" && (
          <button
            className="mt-3 rounded-full bg-black px-6 py-1.5 text-sm text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black sm:mt-4 sm:px-20 sm:py-2 sm:text-base"
            onClick={onCategoryUpdate}
            disabled={loading}
          >
            {loading ? "Updating..." : (
              <>
                <span className="sm:hidden">Update</span>
                <span className="hidden sm:inline">Update Categories</span>
              </>
            )}
          </button>
        )}
      </section>}

      {/* Manage Followed Profiles Section */}
      {wise === "customProfiles" && <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#7FFFD4] sm:text-xl">
            Your profiles ({profiles.length}/{MAX_CUSTOM_PROFILES})
          </h2>
          <button
            onClick={() => setShowSettingInfo("profiles-manage")}
            className="text-[#7FFFD4] hover:text-white transition-colors"
            aria-label="Show profiles management information"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
        </div>
        {renderSettingInfo("profiles-manage", showSettingInfo)}
        {unsavedProfiles && (
          <div className="p-3 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400">
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mt-0.5 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium mb-1">Unsaved changes</p>
                <p className="text-sm">
                  {wise === "customProfiles" &&
                  registeredWise === "customProfiles"
                    ? 'Click "Update Profiles" below to save your profile changes.'
                    : 'You need to switch to Profiles feed type and click "Update Feed Type" to use these profiles.'}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <div
              key={profile.username}
              className="flex items-center gap-2 rounded-full border border-[#7FFFD4] px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
            >
              <Avatar
                username={profile.username}
                avatar={profile.avatar}
                size="small"
              />
              <span>@{profile.username}</span>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => onRemoveProfile(profile.username)}
                disabled={loading || wise === "categorywise"}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {wise === "customProfiles" && profiles.length >= MAX_CUSTOM_PROFILES && (
          <p className="text-sm text-yellow-400 mt-2">
            Not allowed more than {MAX_CUSTOM_PROFILES} profiles. Remove one
            to add another.
          </p>
        )}
        {wise === "customProfiles" && (
          <div className="relative mt-4">
            <input
              type="text"
              value={newProfile}
              onChange={onSearchInputChange}
              placeholder="@username"
              className="w-full rounded-lg border border-gray-800 bg-black px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-[#7FFFD4] focus:outline-none disabled:opacity-50 sm:px-4 sm:py-2 sm:text-base"
              disabled={loading || profiles.length >= MAX_CUSTOM_PROFILES}
            />
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-gray-800 bg-black"
              >
                <div className="flex justify-between items-center p-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">Suggestions</span>
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
                <ul className="list-none">
                  {loadingSuggestions ? (
                    <li className="p-2 text-gray-400">Loading...</li>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="cursor-pointer p-2 hover:bg-[#7FFFD4]/10"
                        onClick={() => onAddProfile(suggestion)}
                      >
                        @{suggestion}
                      </li>
                    ))
                  ) : (
                    <li className="p-2 text-gray-400">No result found</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
        {wise === "customProfiles" && registeredWise === "customProfiles" && (
          <button
            className="mt-3 rounded-full bg-black px-6 py-1.5 text-sm text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black sm:mt-4 sm:px-24 sm:py-2 sm:text-base"
            onClick={onProfileUpdate}
            disabled={loading}
          >
            {loading ? "Updating..." : (
              <>
                <span className="sm:hidden">Update</span>
                <span className="hidden sm:inline">Update Profiles</span>
              </>
            )}
          </button>
        )}
      </section>}

      {/* Update Time Section */}
      <section className="space-y-3 border-t border-gray-800 pt-4 sm:space-y-4 sm:pt-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#7FFFD4] sm:text-xl">
            3. Choose delivery time
          </h2>
          <button
            onClick={() => setShowSettingInfo("time-settings")}
            className="text-[#7FFFD4] hover:text-white transition-colors"
            aria-label="Show time settings information"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </button>
        </div>
        {renderSettingInfo("time-settings", showSettingInfo)}
        <div className="flex flex-wrap gap-2">
          {availableTimes.map((timeOption) => (
            <button
              key={timeOption}
              className={`rounded-full px-4 py-1.5 text-xs transition-colors sm:px-6 sm:py-2 sm:text-sm ${
                time.includes(timeOption)
                  ? "bg-[#7FFFD4] text-black"
                  : "border border-[#7FFFD4] text-[#7FFFD4] hover:bg-[#7FFFD4]/10"
              }`}
              onClick={() =>
                setTime((prev) =>
                  prev.includes(timeOption)
                    ? prev.filter((t) => t !== timeOption)
                    : [...prev, timeOption]
                )
              }
              disabled={loading}
            >
              {timeOption}
            </button>
          ))}
        </div>
        <button
          className="mt-3 rounded-full bg-black px-6 py-1.5 text-sm text-[#7FFFD4] border border-[#7FFFD4] transition-colors hover:bg-[#7FFFD4] hover:text-black sm:mt-4 sm:px-28 sm:py-2 sm:text-base"
          onClick={onTimeUpdate}
          disabled={loading}
        >
          {loading ? "Updating..." : (
            <>
              <span className="sm:hidden">Save</span>
              <span className="hidden sm:inline">Save Delivery Time</span>
            </>
          )}
        </button>
      </section>
    </div>
  );
};
