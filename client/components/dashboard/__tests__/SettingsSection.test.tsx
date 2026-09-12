import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSection } from "../SettingsSection";
import { TwitterAccount, UserProfile } from "../types";

function baseProps(
  overrides: Partial<Parameters<typeof SettingsSection>[0]> = {}
) {
  return {
    wise: "categorywise" as const,
    setWise: jest.fn(),
    categories: ["Tech"],
    setCategories: jest.fn(),
    profiles: [] as UserProfile[],
    setProfiles: jest.fn(),
    time: ["Morning"],
    setTime: jest.fn(),
    linkedTwitter: null,
    twitterUsername: "",
    setTwitterUsername: jest.fn(),
    twitterFollowing: [] as TwitterAccount[],
    selectedTwitterAccounts: [] as string[],
    setSelectedTwitterAccounts: jest.fn(),
    showTwitterFollowing: false,
    setShowTwitterFollowing: jest.fn(),
    unsavedProfiles: false,
    registeredWise: "categorywise",
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
    suggestions: [] as string[],
    showDropdown: false,
    setShowDropdown: jest.fn(),
    loadingSuggestions: false,
    dropdownRef: createRef<HTMLDivElement>(),
    twitterDropdownRef: createRef<HTMLDivElement>(),
    twitterSuggestions: [] as string[],
    showTwitterSuggestions: false,
    setShowTwitterSuggestions: jest.fn(),
    loadingTwitterSuggestions: false,
    twitterSuggestionsRef: createRef<HTMLDivElement>(),
    ...overrides,
  };
}

describe("SettingsSection — Feed Type", () => {
  it("switches feed type and triggers the update callback", async () => {
    const user = userEvent.setup();
    const setWise = jest.fn();
    const onFeedTypeUpdate = jest.fn();
    render(<SettingsSection {...baseProps({ setWise, onFeedTypeUpdate })} />);
    await user.click(screen.getByText("Profiles"));
    expect(setWise).toHaveBeenCalledWith("customProfiles");
    await user.click(screen.getByText("Update Feed Type"));
    expect(onFeedTypeUpdate).toHaveBeenCalledTimes(1);
  });

  it("shows 'Updating...' and disables every update button while loading", () => {
    render(<SettingsSection {...baseProps({ loading: true })} />);
    const buttons = screen.getAllByRole("button", { name: "Updating..." });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("shows the feed-type info panel when requested", () => {
    render(
      <SettingsSection {...baseProps({ showSettingInfo: "feed-type" })} />
    );
    expect(screen.getByText(/Choose how your feed is organized/)).toBeInTheDocument();
  });

  it("opens the info panel when the info icon is clicked", async () => {
    const user = userEvent.setup();
    const setShowSettingInfo = jest.fn();
    render(<SettingsSection {...baseProps({ setShowSettingInfo })} />);
    await user.click(
      screen.getByRole("button", { name: "Show feed type information" })
    );
    expect(setShowSettingInfo).toHaveBeenCalledWith("feed-type");
  });

  it("wires up every other settings info icon", async () => {
    const user = userEvent.setup();
    const setShowSettingInfo = jest.fn();
    render(<SettingsSection {...baseProps({ setShowSettingInfo })} />);
    await user.click(
      screen.getByRole("button", { name: "Show Twitter connect information" })
    );
    expect(setShowSettingInfo).toHaveBeenCalledWith("twitter-connect");
    await user.click(
      screen.getByRole("button", { name: "Show categories information" })
    );
    expect(setShowSettingInfo).toHaveBeenCalledWith("categories");
    await user.click(
      screen.getByRole("button", {
        name: "Show profiles management information",
      })
    );
    expect(setShowSettingInfo).toHaveBeenCalledWith("profiles-manage");
    await user.click(
      screen.getByRole("button", { name: "Show time settings information" })
    );
    expect(setShowSettingInfo).toHaveBeenCalledWith("time-settings");
  });

  it("shows each info panel's content for the other settings", () => {
    const cases: [string, RegExp][] = [
      ["twitter-connect", /Connect your X\/Twitter account/],
      ["categories", /Select the topics you want to see/],
      ["profiles-manage", /Add or remove specific accounts/],
      ["time-settings", /Choose when you'd like to receive/],
    ];
    cases.forEach(([setting, text]) => {
      const { unmount } = render(
        <SettingsSection {...baseProps({ showSettingInfo: setting })} />
      );
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    });
  });
});

describe("SettingsSection — Twitter connect", () => {
  it("shows the connect form when not linked", () => {
    render(<SettingsSection {...baseProps({ linkedTwitter: null })} />);
    expect(
      screen.getByPlaceholderText("@YourUsername")
    ).toBeInTheDocument();
  });

  it("calls onTwitterUsernameChange as the user types", async () => {
    const user = userEvent.setup();
    const onTwitterUsernameChange = jest.fn();
    render(
      <SettingsSection {...baseProps({ onTwitterUsernameChange })} />
    );
    await user.type(screen.getByPlaceholderText("@YourUsername"), "a");
    expect(onTwitterUsernameChange).toHaveBeenCalled();
  });

  it("disables Connect until a username is entered, and calls onConnectTwitter", async () => {
    const user = userEvent.setup();
    const onConnectTwitter = jest.fn();
    render(
      <SettingsSection
        {...baseProps({ twitterUsername: "", onConnectTwitter })}
      />
    );
    expect(screen.getByText("Connect").closest("button")).toBeDisabled();

    render(
      <SettingsSection
        {...baseProps({ twitterUsername: "elon", onConnectTwitter })}
      />
    );
    const connectBtns = screen.getAllByText("Connect");
    await user.click(connectBtns[connectBtns.length - 1]);
    expect(onConnectTwitter).toHaveBeenCalledTimes(1);
  });

  it("shows a connecting spinner state", () => {
    render(
      <SettingsSection
        {...baseProps({ isConnectingTwitter: true, twitterUsername: "elon" })}
      />
    );
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("shows twitter username suggestions and selects one", async () => {
    const user = userEvent.setup();
    const setTwitterUsername = jest.fn();
    const setShowTwitterSuggestions = jest.fn();
    render(
      <SettingsSection
        {...baseProps({
          showTwitterSuggestions: true,
          twitterSuggestions: ["elonmusk"],
          setTwitterUsername,
          setShowTwitterSuggestions,
        })}
      />
    );
    await user.click(screen.getByText("@elonmusk"));
    expect(setTwitterUsername).toHaveBeenCalledWith("elonmusk");
    expect(setShowTwitterSuggestions).toHaveBeenCalledWith(false);
  });

  it("shows a loading state and a no-results state for twitter suggestions", () => {
    const { rerender } = render(
      <SettingsSection
        {...baseProps({
          showTwitterSuggestions: true,
          loadingTwitterSuggestions: true,
        })}
      />
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    rerender(
      <SettingsSection
        {...baseProps({
          showTwitterSuggestions: true,
          loadingTwitterSuggestions: false,
          twitterSuggestions: [],
        })}
      />
    );
    expect(screen.getByText("No result found")).toBeInTheDocument();
  });

  it("shows the linked state with unlink and show-followed-profiles actions", async () => {
    const user = userEvent.setup();
    const onUnlinkTwitter = jest.fn();
    const onShowFollowedProfiles = jest.fn();
    render(
      <SettingsSection
        {...baseProps({
          linkedTwitter: "elonmusk",
          onUnlinkTwitter,
          onShowFollowedProfiles,
        })}
      />
    );
    expect(screen.getByText("@elonmusk")).toBeInTheDocument();
    await user.click(screen.getByText("Unlink"));
    expect(onUnlinkTwitter).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText("Show Followed Profiles"));
    expect(onShowFollowedProfiles).toHaveBeenCalledTimes(1);
  });

  it("shows an unlinking spinner label while loading", () => {
    render(
      <SettingsSection
        {...baseProps({ linkedTwitter: "elonmusk", loading: true })}
      />
    );
    expect(screen.getByText("Unlinking...")).toBeInTheDocument();
  });

  it("renders the followed-profiles picker and toggles selection", async () => {
    const user = userEvent.setup();
    const onSelectTwitterAccount = jest.fn();
    const onAddSelectedAccounts = jest.fn();
    const account: TwitterAccount = {
      screen_name: "jack",
      name: "Jack",
      profile_image: "",
    };
    render(
      <SettingsSection
        {...baseProps({
          linkedTwitter: "elonmusk",
          showTwitterFollowing: true,
          twitterFollowing: [account],
          selectedTwitterAccounts: ["jack"],
          onSelectTwitterAccount,
          onAddSelectedAccounts,
        })}
      />
    );
    expect(screen.getByText("Jack")).toBeInTheDocument();
    await user.click(screen.getByText("Jack"));
    expect(onSelectTwitterAccount).toHaveBeenCalledWith("jack");
    await user.click(screen.getByText(/Add 1 Selected Account/));
    expect(onAddSelectedAccounts).toHaveBeenCalledTimes(1);
  });

  it("shows a loading indicator while more profiles are loading", () => {
    render(
      <SettingsSection
        {...baseProps({
          linkedTwitter: "elonmusk",
          showTwitterFollowing: true,
          isLoadingMoreProfiles: true,
        })}
      />
    );
    expect(screen.getByText("Loading more profiles...")).toBeInTheDocument();
  });

  it("shows unsaved-profiles warning copy for the customProfiles+registered case", () => {
    render(
      <SettingsSection
        {...baseProps({
          unsavedProfiles: true,
          wise: "customProfiles",
          registeredWise: "customProfiles",
        })}
      />
    );
    expect(
      screen.getByText(/Click "Update Profiles" to save your changes/)
    ).toBeInTheDocument();
  });

  it("shows unsaved-profiles warning copy for the categorywise case", () => {
    render(
      <SettingsSection
        {...baseProps({
          unsavedProfiles: true,
          wise: "categorywise",
          registeredWise: "categorywise",
        })}
      />
    );
    expect(
      screen.getByText(/currently using Category-wise feed/)
    ).toBeInTheDocument();
  });
});

describe("SettingsSection — Categories", () => {
  it("toggles a category selection", async () => {
    const user = userEvent.setup();
    const setCategories = jest.fn();
    render(<SettingsSection {...baseProps({ setCategories })} />);
    await user.click(screen.getByText("AI"));
    expect(setCategories).toHaveBeenCalledWith(expect.any(Function));
    const updater = setCategories.mock.calls[0][0];
    expect(updater(["Tech"])).toEqual(["Tech", "AI"]);
    expect(updater(["Tech", "AI"])).toEqual(["Tech"]);
  });

  it("disables category buttons in customProfiles mode and hides the update button", () => {
    render(<SettingsSection {...baseProps({ wise: "customProfiles" })} />);
    expect(screen.getByText("Tech").closest("button")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Update Categories" })
    ).not.toBeInTheDocument();
  });

  it("only shows Update Categories when wise and registeredWise are both categorywise", async () => {
    const user = userEvent.setup();
    const onCategoryUpdate = jest.fn();
    render(
      <SettingsSection
        {...baseProps({
          wise: "categorywise",
          registeredWise: "categorywise",
          onCategoryUpdate,
        })}
      />
    );
    await user.click(
      screen.getByRole("button", { name: "Update Categories" })
    );
    expect(onCategoryUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("SettingsSection — Manage Profiles", () => {
  it("shows the profile count and removes a profile", async () => {
    const user = userEvent.setup();
    const onRemoveProfile = jest.fn();
    render(
      <SettingsSection
        {...baseProps({
          wise: "customProfiles",
          profiles: [{ username: "alice", avatar: "" }],
          onRemoveProfile,
        })}
      />
    );
    expect(screen.getByText("Manage Followed Profiles (1/10)")).toBeInTheDocument();
    await user.click(screen.getByText("×"));
    expect(onRemoveProfile).toHaveBeenCalledWith("alice");
  });

  it("warns and disables the input when at the max profile count", () => {
    const tenProfiles = Array.from({ length: 10 }, (_, i) => ({
      username: `u${i}`,
      avatar: "",
    }));
    render(
      <SettingsSection
        {...baseProps({ wise: "customProfiles", profiles: tenProfiles })}
      />
    );
    expect(
      screen.getByText(/Not allowed more than 10 profiles/)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("@username")).toBeDisabled();
  });

  it("shows the profile search dropdown with suggestions and adds one", async () => {
    const user = userEvent.setup();
    const onAddProfile = jest.fn();
    render(
      <SettingsSection
        {...baseProps({
          wise: "customProfiles",
          showDropdown: true,
          suggestions: ["newuser"],
          onAddProfile,
        })}
      />
    );
    await user.click(screen.getByText("@newuser"));
    expect(onAddProfile).toHaveBeenCalledWith("newuser");
  });

  it("shows Update Profiles only when wise and registeredWise are both customProfiles", async () => {
    const user = userEvent.setup();
    const onProfileUpdate = jest.fn();
    render(
      <SettingsSection
        {...baseProps({
          wise: "customProfiles",
          registeredWise: "customProfiles",
          onProfileUpdate,
        })}
      />
    );
    await user.click(screen.getByText("Update Profiles"));
    expect(onProfileUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("SettingsSection — Time", () => {
  it("toggles a time preference and calls onTimeUpdate", async () => {
    const user = userEvent.setup();
    const setTime = jest.fn();
    const onTimeUpdate = jest.fn();
    render(<SettingsSection {...baseProps({ setTime, onTimeUpdate })} />);
    await user.click(screen.getByText("Afternoon"));
    expect(setTime).toHaveBeenCalledWith(expect.any(Function));
    const updater = setTime.mock.calls[0][0];
    expect(updater(["Morning"])).toEqual(["Morning", "Afternoon"]);
    expect(updater(["Morning", "Afternoon"])).toEqual(["Morning"]);

    await user.click(screen.getByText("Update Time"));
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
  });

  it("shows 'Updating...' for the time button while loading", () => {
    render(<SettingsSection {...baseProps({ loading: true })} />);
    expect(screen.getAllByText("Updating...").length).toBeGreaterThan(0);
  });
});
