import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "../FilterBar";

function baseProps(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  return {
    wise: "categorywise" as const,
    categories: ["Tech", "Finance"],
    profiles: [{ username: "alice", avatar: "" }],
    selectedCategory: null,
    selectedProfile: null,
    sortBy: "time" as const,
    sortOrder: "desc" as const,
    onCategorySelect: jest.fn(),
    onProfileSelect: jest.fn(),
    onSortByChange: jest.fn(),
    onSortOrderChange: jest.fn(),
    profilesContainerRef: createRef<HTMLDivElement>(),
    scrollProfiles: jest.fn(),
    ...overrides,
  };
}

describe("FilterBar", () => {
  it("renders category buttons in categorywise mode", () => {
    render(<FilterBar {...baseProps()} />);
    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.queryByText("All Profiles")).not.toBeInTheDocument();
  });

  it("renders profile buttons in customProfiles mode", () => {
    render(<FilterBar {...baseProps({ wise: "customProfiles" })} />);
    expect(screen.getByText("All Profiles")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.queryByText("Tech")).not.toBeInTheDocument();
  });

  it("calls onCategorySelect with the category name, then with null for 'All'", async () => {
    const user = userEvent.setup();
    const onCategorySelect = jest.fn();
    render(<FilterBar {...baseProps({ onCategorySelect })} />);
    await user.click(screen.getByText("Tech"));
    expect(onCategorySelect).toHaveBeenCalledWith("Tech");
    await user.click(screen.getByText("All Categories"));
    expect(onCategorySelect).toHaveBeenCalledWith(null);
  });

  it("calls onProfileSelect when a profile chip is clicked", async () => {
    const user = userEvent.setup();
    const onProfileSelect = jest.fn();
    render(
      <FilterBar
        {...baseProps({ wise: "customProfiles", onProfileSelect })}
      />
    );
    await user.click(screen.getByText("@alice"));
    expect(onProfileSelect).toHaveBeenCalledWith("alice");
  });

  it("highlights the selected category", () => {
    render(<FilterBar {...baseProps({ selectedCategory: "Tech" })} />);
    expect(screen.getByText("Tech")).toHaveClass("bg-[#7FFFD4]");
  });

  it("calls onSortByChange and onSortOrderChange", async () => {
    const user = userEvent.setup();
    const onSortByChange = jest.fn();
    const onSortOrderChange = jest.fn();
    render(
      <FilterBar {...baseProps({ onSortByChange, onSortOrderChange })} />
    );
    await user.click(screen.getByText("Likes"));
    expect(onSortByChange).toHaveBeenCalledWith("likes");
    await user.click(screen.getByText("Time"));
    expect(onSortByChange).toHaveBeenCalledWith("time");
  });

  it("calls onSortOrderChange with desc/asc", async () => {
    const user = userEvent.setup();
    const onSortOrderChange = jest.fn();
    const { container } = render(
      <FilterBar {...baseProps({ onSortOrderChange })} />
    );
    const orderButtons = container.querySelectorAll(
      ".rounded-lg.p-2\\.5 button"
    ) as NodeListOf<HTMLButtonElement>;
    expect(orderButtons).toHaveLength(2);
    await user.click(orderButtons[0]);
    expect(onSortOrderChange).toHaveBeenCalledWith("desc");
    await user.click(orderButtons[1]);
    expect(onSortOrderChange).toHaveBeenCalledWith("asc");
  });

  it("highlights the selected profile chip", () => {
    render(
      <FilterBar
        {...baseProps({ wise: "customProfiles", selectedProfile: "alice" })}
      />
    );
    expect(screen.getByText("@alice").closest("button")).toHaveClass(
      "bg-[#7FFFD4]"
    );
  });

  it("calls scrollProfiles with left/right", async () => {
    const user = userEvent.setup();
    const scrollProfiles = jest.fn();
    const { container } = render(
      <FilterBar {...baseProps({ scrollProfiles })} />
    );
    const buttons = container.querySelectorAll(
      "button.absolute"
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons).toHaveLength(2);
    await user.click(buttons[0]);
    expect(scrollProfiles).toHaveBeenCalledWith("left");
    await user.click(buttons[1]);
    expect(scrollProfiles).toHaveBeenCalledWith("right");
  });
});
