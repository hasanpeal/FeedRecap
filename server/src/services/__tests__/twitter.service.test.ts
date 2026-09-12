import moment from "moment-timezone";
import axios from "axios";
import { StoredTweets, CustomProfilePosts } from "../../models/tweet.model";
import {
  fetchAndStoreTweets,
  fetchAndStoreTweetsForProfiles,
} from "../twitter.service";

// A factory mock, not `jest.mock("axios")` bare automock: Jest's automock
// walks axios's real module graph (interceptors, AxiosHeaders getters, etc.)
// which has circular references and reliably OOMs the worker process.
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("../../models/tweet.model", () => ({
  StoredTweets: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
  CustomProfilePosts: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));

process.env.TWITTER_API_HOST = "test.api.host";
process.env.TWITTER_API_KEY = "test-twitter-key";

// `fetchAvatar` (unexported, in twitter.service.ts) previously only
// incremented its retry counter inside the `catch` block, so a response that
// resolved successfully with no `avatar` field looped forever — fixed by
// also incrementing on the no-avatar success path (see the regression test
// below, "stops retrying and falls back to a null avatar..."). Most mocks
// below still resolve a truthy avatar simply because that's the common case
// being tested, not because a falsy one is unsafe anymore.

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedStoredTweets = StoredTweets as unknown as {
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
};
const mockedCustomProfilePosts = CustomProfilePosts as unknown as {
  findOne: jest.Mock;
  findOneAndUpdate: jest.Mock;
};

const twitterDate = (d: Date) => moment(d).format("ddd MMM DD HH:mm:ss ZZ YYYY");

const recentTweet = (overrides: Record<string, any> = {}) => ({
  tweet_id: "1",
  text: "Hello world https://example.com/spam",
  favorites: 10,
  created_at: twitterDate(new Date(Date.now() - 60 * 60 * 1000)), // 1h ago
  media: {},
  ...overrides,
});

const oldTweet = (overrides: Record<string, any> = {}) => ({
  tweet_id: "2",
  text: "old news",
  favorites: 5,
  created_at: twitterDate(new Date(Date.now() - 48 * 60 * 60 * 1000)), // 2 days ago
  media: {},
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedStoredTweets.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
  mockedStoredTweets.findOneAndUpdate.mockResolvedValue({});
  mockedCustomProfilePosts.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
  mockedCustomProfilePosts.findOneAndUpdate.mockReturnValue({
    exec: jest.fn().mockResolvedValue({ screenName: "profile" }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchAndStoreTweets", () => {
  it("skips categories that aren't in the known account map", async () => {
    await fetchAndStoreTweets(["NotACategory"]);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("fetches, filters to the last 24h, and upserts merged tweets for every account in a category", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({
          data: { timeline: [recentTweet(), oldTweet()] },
        });
      }
      if (url.includes("screenname.php")) {
        return Promise.resolve({ data: { avatar: "http://avatar.png" } });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    await fetchAndStoreTweets(["Tech"]);

    // 3 accounts under Tech
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://test.api.host/timeline.php",
      expect.objectContaining({
        params: { screenname: "ycombinator" },
        headers: {
          "x-rapidapi-key": "test-twitter-key",
          "x-rapidapi-host": "test.api.host",
        },
      })
    );
    expect(mockedStoredTweets.findOneAndUpdate).toHaveBeenCalledTimes(3);

    const [filter, update, opts] = mockedStoredTweets.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ category: "Tech", screenName: "ycombinator" });
    expect(opts).toEqual({ upsert: true });
    // Only the recent tweet should survive the 24h filter
    expect(update.tweets).toHaveLength(1);
    expect(update.tweets[0].tweet_id).toBe("1");
    expect(update.tweets[0].text).toBe("Hello world"); // links stripped
    expect(update.avatar).toBe("http://avatar.png");
  });

  it("stops retrying and falls back to a null avatar when the endpoint never returns one (regression: previously an infinite loop)", async () => {
    let screennameCalls = 0;
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [recentTweet()] } });
      }
      if (url.includes("screenname.php")) {
        screennameCalls++;
        return Promise.resolve({ data: {} }); // no `avatar` field, ever
      }
      return Promise.reject(new Error("unexpected url"));
    });

    await fetchAndStoreTweets(["Tech"]);

    // fetchAvatar retries up to 7 times per account before giving up; this
    // asserts it actually stops (bounded call count) rather than hanging.
    expect(screennameCalls).toBe(7 * 3); // 3 accounts under Tech
    const [, update] = mockedStoredTweets.findOneAndUpdate.mock.calls[0];
    expect(update.avatar).toBeNull();
  });

  it("merges newly fetched tweets with unexpired existing ones, deduping by tweet_id", async () => {
    mockedStoredTweets.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        tweets: [
          {
            tweet_id: "existing-fresh",
            likes: 1,
            createdAt: new Date(Date.now() - 60 * 60 * 1000),
          },
          {
            tweet_id: "existing-expired",
            likes: 1,
            createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
          },
        ],
      }),
    });
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [recentTweet({ tweet_id: "new-1" })] } });
      }
      return Promise.resolve({ data: { avatar: "http://avatar.png" } });
    });

    await fetchAndStoreTweets(["AI"]);

    const [, update] = mockedStoredTweets.findOneAndUpdate.mock.calls[0];
    const ids = update.tweets.map((t: any) => t.tweet_id);
    expect(ids).toContain("existing-fresh");
    expect(ids).toContain("new-1");
    expect(ids).not.toContain("existing-expired");
  });

  it("continues to the next account when the timeline fetch fails", async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error("network down"))
      .mockImplementation((url: string) => {
        if (url.includes("timeline.php")) {
          return Promise.resolve({ data: { timeline: [] } });
        }
        return Promise.resolve({ data: { avatar: "http://avatar.png" } });
      });

    await expect(fetchAndStoreTweets(["Tech"])).resolves.toBeUndefined();
    // The other 2 Tech accounts should still be attempted/stored.
    expect(mockedStoredTweets.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it("retries the avatar fetch on failure and stops once it succeeds", async () => {
    // Sports has 4 accounts; only fail the retries for the first
    // (SportsCenter) so per-account call counts don't bleed into each other.
    const avatarCallsByAccount: Record<string, number> = {};
    mockedAxios.get.mockImplementation((url: string, config: any) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [] } });
      }
      const screenname = config.params.screenname;
      avatarCallsByAccount[screenname] = (avatarCallsByAccount[screenname] ?? 0) + 1;
      if (screenname === "SportsCenter" && avatarCallsByAccount[screenname] < 3) {
        return Promise.reject(new Error("rate limited"));
      }
      return Promise.resolve({ data: { avatar: "http://avatar.png" } });
    });

    await fetchAndStoreTweets(["Sports"]);

    const [, update] = mockedStoredTweets.findOneAndUpdate.mock.calls[0];
    expect(update.avatar).toBe("http://avatar.png");
    expect(avatarCallsByAccount.SportsCenter).toBe(3);
  });

  it("gives up on the avatar after the max retry count and stores a null avatar", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [] } });
      }
      return Promise.reject(new Error("always fails"));
    });

    await fetchAndStoreTweets(["Sports"]);

    const [, update] = mockedStoredTweets.findOneAndUpdate.mock.calls[0];
    expect(update.avatar).toBeNull();
  });

  it("extracts media/video thumbnails and quoted tweets when present", async () => {
    const withMedia = recentTweet({
      tweet_id: "media-1",
      media: {
        photo: [{ media_url_https: "http://photo.png" }],
        video: [
          {
            media_url_https: "http://video-thumb.png",
            variants: [{ url: "http://v1.mp4" }, { url: "http://v2.mp4" }],
          },
        ],
      },
      quoted: {
        tweet_id: "quoted-1",
        text: "quoted text",
        favorites: 3,
        created_at: twitterDate(new Date()),
        author: { screen_name: "someone", avatar: "http://qavatar.png" },
      },
    });
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [withMedia] } });
      }
      return Promise.resolve({ data: { avatar: "http://avatar.png" } });
    });

    await fetchAndStoreTweets(["Meme"]);

    const [, update] = mockedStoredTweets.findOneAndUpdate.mock.calls[0];
    const tweet = update.tweets.find((t: any) => t.tweet_id === "media-1");
    expect(tweet.mediaThumbnail).toBe("http://photo.png");
    expect(tweet.video).toBe("http://v2.mp4");
    expect(tweet.videoThumbnail).toBe("http://video-thumb.png");
    expect(tweet.quotedTweet).toMatchObject({
      tweet_id: "quoted-1",
      text: "quoted text",
      screenName: "someone",
      avatar: "http://qavatar.png",
    });
  });
});

describe("fetchAndStoreTweetsForProfiles", () => {
  it("returns immediately and makes no requests when given no profiles", async () => {
    await fetchAndStoreTweetsForProfiles([]);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("stores merged tweets for a profile with recent activity", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [recentTweet()] } });
      }
      return Promise.resolve({ data: { avatar: "http://avatar.png" } });
    });

    await fetchAndStoreTweetsForProfiles(["elonmusk"]);

    expect(mockedCustomProfilePosts.findOneAndUpdate).toHaveBeenCalledWith(
      { screenName: "elonmusk" },
      expect.objectContaining({
        $set: expect.objectContaining({ avatar: "http://avatar.png" }),
      }),
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });

  it("logs and continues when a profile has no tweets in the last 24h", async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [oldTweet()] } });
      }
      return Promise.resolve({ data: { avatar: null } });
    });

    await expect(fetchAndStoreTweetsForProfiles(["quietuser"])).resolves.toBeUndefined();
    expect(mockedCustomProfilePosts.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("logs an error when the upsert returns falsy", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes("timeline.php")) {
        return Promise.resolve({ data: { timeline: [recentTweet()] } });
      }
      return Promise.resolve({ data: { avatar: "http://avatar.png" } });
    });
    mockedCustomProfilePosts.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await fetchAndStoreTweetsForProfiles(["ghost"]);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save tweets"),
    );
  });

  it("catches and continues when the timeline fetch throws", async () => {
    mockedAxios.get.mockRejectedValue(new Error("boom"));

    await expect(
      fetchAndStoreTweetsForProfiles(["broken", "also-broken"])
    ).resolves.toBeUndefined();
    expect(mockedCustomProfilePosts.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
