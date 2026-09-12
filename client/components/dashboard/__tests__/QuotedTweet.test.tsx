import { render, screen } from "@testing-library/react";
import { QuotedTweet } from "../QuotedTweet";

const baseQuoted = {
  tweet_id: "123",
  text: "hello world",
  likes: 5,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  mediaThumbnail: "",
  video: "",
  videoThumbnail: "",
  avatar: "",
  username: "quoteduser",
};

describe("QuotedTweet", () => {
  it("renders nothing when quotedTweet is undefined", () => {
    const { container } = render(<QuotedTweet quotedTweet={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when quotedTweet has no username", () => {
    const { container } = render(
      <QuotedTweet quotedTweet={{ ...baseQuoted, username: "" }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the quoted username and text", () => {
    render(<QuotedTweet quotedTweet={baseQuoted} />);
    expect(screen.getByText("@quoteduser")).toBeInTheDocument();
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("truncates text longer than 150 characters", () => {
    const longText = "a".repeat(200);
    render(<QuotedTweet quotedTweet={{ ...baseQuoted, text: longText }} />);
    expect(screen.getByText(`${"a".repeat(150)}...`)).toBeInTheDocument();
  });

  it("renders an empty paragraph when text is empty", () => {
    render(<QuotedTweet quotedTweet={{ ...baseQuoted, text: "" }} />);
    expect(screen.getByText("@quoteduser")).toBeInTheDocument();
  });
});
