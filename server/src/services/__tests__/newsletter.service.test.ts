import mongoose from "mongoose";

// Factory mocks throughout (never bare `jest.mock("pkg")` automock) — an
// automocked `axios` reliably OOM-crashed twitter.service.test.ts by walking
// its real circular module graph; the same risk applies to any large SDK
// (openai, @sendgrid/mail), so every external dependency here gets an
// explicit, minimal factory mock instead.
const mockCreate = jest.fn();
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

const mockSgMailSend = jest.fn();
jest.mock("../email.service", () => ({
  __esModule: true,
  default: { send: mockSgMailSend },
}));

jest.mock("../../models/user.model", () => ({
  User: { findById: jest.fn() },
}));

const mockNewsletterSave = jest.fn();
jest.mock("../../models/newsletter.model", () => ({
  Newsletter: jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: mockNewsletterSave,
  })),
}));

jest.mock("../../models/tweet.model", () => ({
  StoredTweets: { find: jest.fn() },
  CustomProfilePosts: { find: jest.fn() },
}));

import { User } from "../../models/user.model";
import { Newsletter } from "../../models/newsletter.model";
import { StoredTweets, CustomProfilePosts } from "../../models/tweet.model";
import {
  isValidEmail,
  fetchTweetsForCategories,
  getStoredTweetsForUser,
  generateNewsletter,
  generateCustomProfileNewsletter,
  sendNewsletterEmail,
} from "../newsletter.service";

const mockedUser = User as unknown as { findById: jest.Mock };
const mockedStoredTweets = StoredTweets as unknown as { find: jest.Mock };
const mockedCustomProfilePosts = CustomProfilePosts as unknown as {
  find: jest.Mock;
};

const tweetEntry = (overrides: Record<string, any> = {}) => ({
  text: "some post",
  likes: 10,
  tweet_id: "t1",
  createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isValidEmail", () => {
  it("accepts well-formed emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects malformed emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("@nouser.com")).toBe(false);
    expect(isValidEmail("spaces in@email.com")).toBe(false);
  });
});

describe("fetchTweetsForCategories", () => {
  it("returns empty results when no categories have stored tweets", async () => {
    mockedStoredTweets.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await fetchTweetsForCategories(["Tech"]);

    expect(result.tweetsByCategory).toEqual([]);
    expect(result.top15Tweets).toEqual([]);
  });

  it("builds tweetsByCategory and top15Tweets, keeping only tweets from the last 24h", async () => {
    mockedStoredTweets.find.mockImplementation(({ category }: { category: string }) => ({
      exec: jest.fn().mockResolvedValue(
        category === "Tech"
          ? [
              {
                screenName: "userA",
                category: "Tech",
                tweets: [
                  tweetEntry({ tweet_id: "recent-1", likes: 5, text: "fresh" }),
                  tweetEntry({
                    tweet_id: "old-1",
                    likes: 999,
                    text: "stale",
                    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                  }),
                ],
              },
            ]
          : []
      ),
    }));

    const result = await fetchTweetsForCategories(["Tech"]);

    expect(result.tweetsByCategory).toEqual([
      { category: "Tech", tweetsByUser: [{ screenName: "userA", tweets: ["fresh"] }] },
    ]);
    expect(result.top15Tweets).toHaveLength(1);
    expect(result.top15Tweets[0]).toMatchObject({ screenName: "userA", tweet_id: "recent-1" });
  });

  it("picks at most one top tweet per user, then fills remaining slots from other users' next-best tweets", async () => {
    // 2 users so the "fill remaining slots" branch has another user's tweets
    // to draw from (it explicitly excludes users already represented).
    mockedStoredTweets.find.mockImplementation(({ category }: { category: string }) => ({
      exec: jest.fn().mockResolvedValue(
        category === "Tech"
          ? [
              {
                screenName: "userA",
                category: "Tech",
                tweets: [
                  tweetEntry({ tweet_id: "a1", likes: 100 }),
                  tweetEntry({ tweet_id: "a2", likes: 90 }),
                ],
              },
              {
                screenName: "userB",
                category: "Tech",
                tweets: [tweetEntry({ tweet_id: "b1", likes: 50 })],
              },
            ]
          : []
      ),
    }));

    const result = await fetchTweetsForCategories(["Tech"]);

    // One top tweet per user (a1, b1) — the fill branch only adds tweets
    // from users NOT already represented, so a2 is never added.
    const ids = result.top15Tweets.map((t) => t.tweet_id);
    expect(ids).toEqual(["a1", "b1"]);
  });

  it("caps top15Tweets at 15 even with more than 15 distinct users", async () => {
    const users = Array.from({ length: 20 }, (_, i) => ({
      screenName: `user${i}`,
      category: "Tech",
      tweets: [tweetEntry({ tweet_id: `t${i}`, likes: i })],
    }));
    mockedStoredTweets.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(users) });

    const result = await fetchTweetsForCategories(["Tech"]);

    expect(result.top15Tweets).toHaveLength(15);
  });
});

describe("getStoredTweetsForUser", () => {
  const userId = new mongoose.Types.ObjectId();

  it("returns empty results when the user doesn't exist", async () => {
    mockedUser.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const result = await getStoredTweetsForUser(userId);

    expect(result).toEqual({ tweetsByProfiles: [], top15Tweets: [] });
  });

  it("returns empty results when the user has no preferred profiles", async () => {
    mockedUser.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ profiles: [] }),
    });

    const result = await getStoredTweetsForUser(userId);

    expect(result).toEqual({ tweetsByProfiles: [], top15Tweets: [] });
  });

  it("returns empty results when no posts match the user's profiles", async () => {
    mockedUser.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ profiles: ["elonmusk"] }),
    });
    mockedCustomProfilePosts.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await getStoredTweetsForUser(userId);

    expect(result).toEqual({ tweetsByProfiles: [], top15Tweets: [] });
  });

  it("skips posts with no tweets and picks the top-liked tweet per profile", async () => {
    mockedUser.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ profiles: ["userA", "empty-profile"] }),
    });
    mockedCustomProfilePosts.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          screenName: "userA",
          tweets: [
            tweetEntry({ tweet_id: "a-low", likes: 1, text: "low" }),
            tweetEntry({ tweet_id: "a-high", likes: 99, text: "high" }),
          ],
        },
        { screenName: "empty-profile", tweets: [] },
      ]),
    });

    const result = await getStoredTweetsForUser(userId);

    // topRecentTweets sorts by likes descending before slicing.
    expect(result.tweetsByProfiles).toEqual([
      { profile: "userA", tweets: ["high", "low"] },
    ]);
    expect(result.top15Tweets).toEqual([
      { screenName: "userA", text: "high", likes: 99, tweet_id: "a-high" },
    ]);
  });

  it("returns empty results and doesn't throw when the User lookup errors", async () => {
    mockedUser.findById.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error("db down")),
    });

    const result = await getStoredTweetsForUser(userId);

    expect(result).toEqual({ tweetsByProfiles: [], top15Tweets: [] });
  });
});

describe("generateNewsletter", () => {
  it("appends the top 15 tweets to the OpenAI-generated content and renders it to HTML", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "**Summary**\nToday was wild." } }],
    });

    const html = await generateNewsletter(
      [{ category: "Tech", tweetsByUser: [{ screenName: "userA", tweets: ["hi"] }] }],
      [
        {
          screenName: "userA",
          category: "Tech",
          tweet: "big news",
          likes: 5,
          tweet_id: "abc",
        },
      ]
    );

    expect(html).toContain("Today was wild");
    expect(html).toContain("TOP POSTS OF TODAY");
    expect(html).toContain("big news");
    expect(html).toContain("https://x.com/userA/status/abc");
  });

  it("returns undefined and doesn't throw when the OpenAI call fails", async () => {
    mockCreate.mockRejectedValue(new Error("openai down"));

    const html = await generateNewsletter([], []);

    expect(html).toBeUndefined();
  });
});

describe("generateCustomProfileNewsletter", () => {
  it("filters out top tweets with a missing/invalid text field before appending them", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Profile digest" } }],
    });

    const html = await generateCustomProfileNewsletter(
      [{ profile: "userA", tweets: ["hi"] }],
      [
        { screenName: "userA", text: "valid tweet", likes: 5, tweet_id: "1" },
        { screenName: "userB", text: undefined as any, likes: 1, tweet_id: "2" },
      ]
    );

    expect(html).toContain("Profile digest");
    expect(html).toContain("valid tweet");
    expect(html).not.toContain("userB");
  });

  it("returns undefined and doesn't throw when the OpenAI call fails", async () => {
    mockCreate.mockRejectedValue(new Error("openai down"));

    const html = await generateCustomProfileNewsletter([], []);

    expect(html).toBeUndefined();
  });
});

describe("sendNewsletterEmail", () => {
  const buildUser = (overrides: Record<string, any> = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    email: "user@example.com",
    newsletter: "old content",
    totalnewsletter: 2,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it("saves the newsletter, emails it, and updates the user's newsletter count", async () => {
    mockNewsletterSave.mockResolvedValue({ _id: "newsletter-id-1" });
    mockSgMailSend.mockResolvedValue(undefined);
    const user = buildUser();

    await sendNewsletterEmail(user as any, "<p>content</p>");

    expect(Newsletter).toHaveBeenCalledWith({ user: user._id, content: "<p>content</p>" });
    expect(mockSgMailSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" })
    );
    expect(user.newsletter).toBe("<p>content</p>");
    expect(user.totalnewsletter).toBe(3);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it("defaults totalnewsletter to 1 when the user had none before", async () => {
    mockNewsletterSave.mockResolvedValue({ _id: "newsletter-id-2" });
    mockSgMailSend.mockResolvedValue(undefined);
    const user = buildUser({ totalnewsletter: undefined });

    await sendNewsletterEmail(user as any, "<p>content</p>");

    expect(user.totalnewsletter).toBe(1);
  });

  it("does not update the user when sending the email fails", async () => {
    mockNewsletterSave.mockResolvedValue({ _id: "newsletter-id-3" });
    mockSgMailSend.mockRejectedValue(new Error("sendgrid down"));
    const user = buildUser();

    await sendNewsletterEmail(user as any, "<p>content</p>");

    expect(user.save).not.toHaveBeenCalled();
    expect(user.newsletter).toBe("old content");
  });
});
