import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSection } from "../SettingsSection";

const props = (overrides: Record<string, unknown> = {}) => ({
  wise: "customProfiles" as const,
  setWise: jest.fn(),
  categories: ["Tech"],
  setCategories: jest.fn(),
  profiles: [],
  setProfiles: jest.fn(),
  time: ["Morning"],
  setTime: jest.fn(),
  linkedTwitter: null,
  twitterUsername: "",
  setTwitterUsername: jest.fn(),
  twitterFollowing: [],
  selectedTwitterAccounts: [],
  setSelectedTwitterAccounts: jest.fn(),
  showTwitterFollowing: false,
  setShowTwitterFollowing: jest.fn(),
  unsavedProfiles: false,
  registeredWise: "customProfiles",
  loading: false,
  isConnectingTwitter: false,
  isLoadingMoreProfiles: false,
  isSavingTwitter: false,
  showSettingInfo: null,
  setShowSettingInfo: jest.fn(),
  onFeedTypeUpdate: jest.fn(),
  onCategoryUpdate: jest.fn(),
  onProfileUpdate: jest.fn(),
  onTimeUpdate: jest.fn(),
  onConnectTwitter: jest.fn(),
  onUnlinkTwitter: jest.fn(),
  onShowFollowedProfiles: jest.fn(),
  onAddSelectedAccounts: jest.fn(),
  onSelectTwitterAccount: jest.fn(),
  onAddProfile: jest.fn(),
  onRemoveProfile: jest.fn(),
  onSearchInputChange: jest.fn(),
  onTwitterUsernameChange: jest.fn(),
  newProfile: "",
  suggestions: [],
  showDropdown: false,
  setShowDropdown: jest.fn(),
  loadingSuggestions: false,
  dropdownRef: createRef<HTMLDivElement>(),
  twitterDropdownRef: createRef<HTMLDivElement>(),
  twitterSuggestions: [],
  showTwitterSuggestions: false,
  setShowTwitterSuggestions: jest.fn(),
  loadingTwitterSuggestions: false,
  twitterSuggestionsRef: createRef<HTMLDivElement>(),
  ...overrides,
});

describe("SettingsSection dismiss actions", () => {
  it("closes the X username suggestions", async () => {
    const user = userEvent.setup();
    const setShowTwitterSuggestions = jest.fn();
    render(
      <SettingsSection
        {...props({ showTwitterSuggestions: true, setShowTwitterSuggestions })}
      />
    );

    await user.click(screen.getByRole("button", { name: "" }));
    expect(setShowTwitterSuggestions).toHaveBeenCalledWith(false);
  });

  it("cancels the followed-profiles picker", async () => {
    const user = userEvent.setup();
    const setShowTwitterFollowing = jest.fn();
    render(
      <SettingsSection
        {...props({
          linkedTwitter: "owner",
          showTwitterFollowing: true,
          setShowTwitterFollowing,
        })}
      />
    );

    await user.click(screen.getByText("Cancel"));
    expect(setShowTwitterFollowing).toHaveBeenCalledWith(false);
  });

  it("opens category help in category mode", async () => {
    const user = userEvent.setup();
    const setShowSettingInfo = jest.fn();
    render(
      <SettingsSection
        {...props({ wise: "categorywise", registeredWise: "categorywise", setShowSettingInfo })}
      />
    );

    await user.click(screen.getByRole("button", { name: "Show categories information" }));
    expect(setShowSettingInfo).toHaveBeenCalledWith("categories");
  });
});
