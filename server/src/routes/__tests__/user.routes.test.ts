import request from "supertest";
import app from "../../app";
import { User } from "../../models/user.model";
import { Newsletter } from "../../models/newsletter.model";
import { StoredTweets, CustomProfilePosts } from "../../models/tweet.model";
import { logActivity } from "../../services/auditLog.service";
import { fetchAndStoreTweetsForProfiles } from "../../services/twitter.service";
import {
  fetchTweetsForCategories,
  generateNewsletter,
  sendNewsletterEmail,
  generateCustomProfileNewsletter,
  getStoredTweetsForUser,
} from "../../services/newsletter.service";
import { signJWT } from "../../services/auth.service";

jest.mock("../../models/user.model", () => {
  function UserCtor(this: any, data: any) {
    Object.assign(this, data);
    this._id = data._id || "newUserId123";
    this.save = jest.fn().mockResolvedValue(undefined);
  }
  return {
    __esModule: true,
    User: Object.assign(jest.fn(UserCtor), {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    }),
  };
});

jest.mock("../../models/newsletter.model", () => ({
  __esModule: true,
  Newsletter: { findOne: jest.fn() },
}));

jest.mock("../../models/tweet.model", () => ({
  __esModule: true,
  StoredTweets: { aggregate: jest.fn(), find: jest.fn() },
  CustomProfilePosts: { aggregate: jest.fn(), find: jest.fn() },
}));

jest.mock("../../services/auditLog.service", () => ({
  __esModule: true,
  logActivity: jest.fn().mockResolvedValue(undefined),
  ActivityType: {
    TWITTER_ACCOUNT_UNLINKED: "TWITTER_ACCOUNT_UNLINKED",
    TWITTER_ACCOUNT_LINKED: "TWITTER_ACCOUNT_LINKED",
    PROFILES_UPDATED: "PROFILES_UPDATED",
    FEED_TYPE_UPDATED: "FEED_TYPE_UPDATED",
    CATEGORIES_UPDATED: "CATEGORIES_UPDATED",
    ACCOUNT_UPDATED: "ACCOUNT_UPDATED",
  },
}));

jest.mock("../../services/twitter.service", () => ({
  __esModule: true,
  fetchAndStoreTweetsForProfiles: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/newsletter.service", () => ({
  __esModule: true,
  fetchTweetsForCategories: jest
    .fn()
    .mockResolvedValue({ tweetsByCategory: {}, top15Tweets: [] }),
  generateNewsletter: jest.fn().mockResolvedValue(null),
  sendNewsletterEmail: jest.fn().mockResolvedValue(undefined),
  generateCustomProfileNewsletter: jest.fn().mockResolvedValue(null),
  getStoredTweetsForUser: jest
    .fn()
    .mockResolvedValue({ tweetsByProfiles: {}, top15Tweets: [] }),
}));

const token = signJWT({ userId: "user123", email: "user@example.com" });
const flush = () => new Promise((resolve) => setImmediate(resolve));

function selectMock(result: any) {
  return jest.fn().mockResolvedValue(result);
}

describe("user routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /data", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/data");
      expect(res.status).toBe(401);
    });

    it("returns 404 when the user doesn't exist", async () => {
      (User.findOne as jest.Mock).mockReturnValue({ select: selectMock(null) });
      const res = await request(app)
        .get("/data")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("returns category-wise posts with pagination", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({
          categories: ["AI"],
          time: ["Morning"],
          timezone: "EST",
          newsletter: "n",
          wise: "categorywise",
          profiles: [],
          twitterUsername: null,
        }),
      });
      (Newsletter.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: selectMock({ _id: "news1" }),
        }),
      });
      (StoredTweets.aggregate as jest.Mock).mockResolvedValue([
        {
          username: "alice",
          avatar: "a.png",
          time: new Date(),
          likes: 5,
          category: "AI",
          text: "hi",
          tweet_id: "1",
        },
      ]);
      (StoredTweets.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { screenName: "alice", avatar: "a.png" },
          ]),
        }),
      });

      const res = await request(app)
        .get("/data")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.posts[0].username).toBe("alice");
      expect(res.body.profileAvatars).toEqual({ alice: "a.png" });
      expect(res.body.pagination).toEqual({ page: 1, limit: 50, hasMore: false });
      expect(res.body.user.latestNewsletterId).toBe("news1");
    });

    it("narrows the category match stage when a valid category filter is passed", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({
          categories: ["AI", "Politics"],
          time: ["Morning"],
          timezone: "EST",
          newsletter: "n",
          wise: "categorywise",
          profiles: [],
          twitterUsername: null,
        }),
      });
      (Newsletter.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: selectMock(null),
        }),
      });
      (StoredTweets.aggregate as jest.Mock).mockResolvedValue([]);
      (StoredTweets.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app)
        .get("/data")
        .query({ category: "AI" })
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const aggregateCall = (StoredTweets.aggregate as jest.Mock).mock
        .calls[0][0];
      expect(aggregateCall[0].$match.category).toBe("AI");
    });

    it("ignores a category filter that isn't one of the user's categories", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({
          categories: ["AI"],
          time: ["Morning"],
          timezone: "EST",
          newsletter: "n",
          wise: "categorywise",
          profiles: [],
          twitterUsername: null,
        }),
      });
      (Newsletter.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: selectMock(null),
        }),
      });
      (StoredTweets.aggregate as jest.Mock).mockResolvedValue([]);
      (StoredTweets.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app)
        .get("/data")
        .query({ category: "NotSubscribed" })
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const aggregateCall = (StoredTweets.aggregate as jest.Mock).mock
        .calls[0][0];
      expect(aggregateCall[0].$match.category).toEqual({
        $in: ["AI"],
      });
    });

    it("returns custom-profile posts and honors query params", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({
          categories: [],
          time: [],
          timezone: "EST",
          newsletter: "n",
          wise: "customProfiles",
          profiles: ["bob"],
          twitterUsername: "bob",
        }),
      });
      (Newsletter.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({ select: selectMock(null) }),
      });
      (CustomProfilePosts.aggregate as jest.Mock).mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => ({
          username: "bob",
          time: new Date(),
          likes: i,
          text: "t",
          tweet_id: String(i),
        }))
      );
      (CustomProfilePosts.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ screenName: "bob", avatar: "b.png" }]),
        }),
      });

      const res = await request(app)
        .get("/data?page=1&limit=2&sortBy=likes&sortOrder=asc&profile=bob")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(2);
      expect(res.body.pagination.hasMore).toBe(true);
      expect(res.body.user.latestNewsletterId).toBeNull();
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(app)
        .get("/data")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  describe("GET /trending", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/trending");
      expect(res.status).toBe(401);
    });

    it("returns 404 when the user doesn't exist", async () => {
      (User.findOne as jest.Mock).mockReturnValue({ select: selectMock(null) });
      const res = await request(app)
        .get("/trending")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it("returns an empty list when wise is neither known value", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({ wise: "somethingElse", categories: [], profiles: [] }),
      });
      const res = await request(app)
        .get("/trending")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ posts: [], code: 0 });
    });

    it("returns trending category-wise posts", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({ wise: "categorywise", categories: ["AI"], profiles: [] }),
      });
      (StoredTweets.aggregate as jest.Mock).mockResolvedValue([
        { username: "alice", likes: 10, text: "hi", tweet_id: "1" },
      ]);

      const res = await request(app)
        .get("/trending")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
    });

    it("returns trending custom-profile posts", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: selectMock({ wise: "customProfiles", categories: [], profiles: ["bob"] }),
      });
      (CustomProfilePosts.aggregate as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get("/trending")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toEqual([]);
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(app)
        .get("/trending")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /unlinkX", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).post("/unlinkX");
      expect(res.status).toBe(401);
    });

    it("unlinks and logs activity when the user exists", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ email: "user@example.com" });
      const res = await request(app)
        .post("/unlinkX")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "TWITTER_ACCOUNT_UNLINKED" })
      );
    });

    it("skips logging when the user isn't found but still responds success", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/unlinkX")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(logActivity).not.toHaveBeenCalled();
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/unlinkX")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /saveX", () => {
    it("returns 400 when email or twitterUsername missing", async () => {
      const res = await request(app).post("/saveX").send({ email: "a@b.com" });
      expect(res.status).toBe(400);
    });

    it("links and logs activity when the user exists", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "a@b.com",
      });
      const res = await request(app)
        .post("/saveX")
        .send({ email: "a@b.com", twitterUsername: "handle" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "TWITTER_ACCOUNT_LINKED" })
      );
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/saveX")
        .send({ email: "a@b.com", twitterUsername: "handle" });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /updateProfiles", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).post("/updateProfiles").send({ profiles: [] });
      expect(res.status).toBe(401);
    });

    it("returns 400 when profiles is not an array", async () => {
      const res = await request(app)
        .post("/updateProfiles")
        .set("Authorization", `Bearer ${token}`)
        .send({ profiles: "nope" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when profiles exceeds the max", async () => {
      const res = await request(app)
        .post("/updateProfiles")
        .set("Authorization", `Bearer ${token}`)
        .send({ profiles: Array.from({ length: 11 }, (_, i) => `p${i}`) });
      expect(res.status).toBe(400);
    });

    it("returns code 1 when the user isn't found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/updateProfiles")
        .set("Authorization", `Bearer ${token}`)
        .send({ profiles: ["bob"] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("updates profiles, fetches tweets for new ones, and returns posts", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ profiles: ["alice"] });
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        profiles: ["alice", "bob"],
      });
      (CustomProfilePosts.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([
          {
            screenName: "bob",
            avatar: "b.png",
            tweets: [
              {
                createdAt: new Date(),
                likes: 1,
                text: "hi",
                tweet_id: "1",
              },
            ],
          },
        ]),
      });

      const res = await request(app)
        .post("/updateProfiles")
        .set("Authorization", `Bearer ${token}`)
        .send({ profiles: ["alice", "bob"] });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.changedProfiles).toEqual(["bob"]);
      expect(res.body.posts).toHaveLength(1);
      expect(fetchAndStoreTweetsForProfiles).toHaveBeenCalledWith(["bob"]);
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "PROFILES_UPDATED" })
      );
    });

    it("skips refetching when no profiles changed", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ profiles: ["alice"] });
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ profiles: ["alice"] });
      (CustomProfilePosts.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .post("/updateProfiles")
        .set("Authorization", `Bearer ${token}`)
        .send({ profiles: ["alice"] });

      expect(res.status).toBe(200);
      expect(fetchAndStoreTweetsForProfiles).not.toHaveBeenCalled();
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/updateProfiles")
        .set("Authorization", `Bearer ${token}`)
        .send({ profiles: ["alice"] });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /updateFeedType", () => {
    it("returns 400 when wise is missing", async () => {
      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 400 for customProfiles with fewer than 3 profiles", async () => {
      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({ wise: "customProfiles", profiles: ["a", "b"] });
      expect(res.status).toBe(400);
    });

    it("returns 400 for customProfiles exceeding the max", async () => {
      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({
          wise: "customProfiles",
          profiles: Array.from({ length: 11 }, (_, i) => `p${i}`),
        });
      expect(res.status).toBe(400);
    });

    it("returns 400 for categorywise with no categories", async () => {
      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({ wise: "categorywise", categories: [] });
      expect(res.status).toBe(400);
    });

    it("returns 404 when the user isn't found", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({ wise: "categorywise", categories: ["AI"] });
      expect(res.status).toBe(404);
    });

    it("updates to customProfiles, refetches, and sends a newsletter afterward", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "a@b.com",
        wise: "customProfiles",
        profiles: ["alice", "bob", "carol"],
      });
      (generateCustomProfileNewsletter as jest.Mock).mockResolvedValue("newsletter body");

      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({ wise: "customProfiles", profiles: ["alice", "bob", "carol"] });

      expect(res.status).toBe(200);
      expect(fetchAndStoreTweetsForProfiles).toHaveBeenCalledWith([
        "alice",
        "bob",
        "carol",
      ]);
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "FEED_TYPE_UPDATED" })
      );

      await flush();
      expect(getStoredTweetsForUser).toHaveBeenCalled();
      expect(generateCustomProfileNewsletter).toHaveBeenCalled();
      expect(sendNewsletterEmail).toHaveBeenCalled();
    });

    it("updates to categorywise and sends a newsletter afterward", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: "u1",
        email: "a@b.com",
        wise: "categorywise",
        categories: ["AI"],
      });
      (generateNewsletter as jest.Mock).mockResolvedValue("newsletter body");

      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({ wise: "categorywise", categories: ["AI"] });

      expect(res.status).toBe(200);

      await flush();
      expect(fetchTweetsForCategories).toHaveBeenCalledWith(["AI"]);
      expect(generateNewsletter).toHaveBeenCalled();
      expect(sendNewsletterEmail).toHaveBeenCalled();
    });

    it("returns 500 on unexpected error", async () => {
      (User.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/updateFeedType")
        .set("Authorization", `Bearer ${token}`)
        .send({ wise: "categorywise", categories: ["AI"] });
      expect(res.status).toBe(500);
    });
  });

  describe("cookie consent routes", () => {
    it("GET /getCookieConsent requires auth and returns consent null", async () => {
      const unauth = await request(app).get("/getCookieConsent");
      expect(unauth.status).toBe(401);

      const res = await request(app)
        .get("/getCookieConsent")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, consent: null });
    });

    it("POST /updateCookieConsent requires auth and confirms update", async () => {
      const unauth = await request(app).post("/updateCookieConsent");
      expect(unauth.status).toBe(401);

      const res = await request(app)
        .post("/updateCookieConsent")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 0,
        message: "Cookie consent updated",
      });
    });
  });

  describe("POST /updateCategories", () => {
    it("updates categories and logs activity", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ email: "a@b.com" });
      const res = await request(app)
        .post("/updateCategories")
        .set("Authorization", `Bearer ${token}`)
        .send({ categories: ["AI", "Tech"] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 0,
        message: "Categories updated successfully",
      });
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "CATEGORIES_UPDATED" })
      );
    });

    it("returns code 1 when the user isn't found", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/updateCategories")
        .set("Authorization", `Bearer ${token}`)
        .send({ categories: ["AI"] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("returns code 1 on unexpected error", async () => {
      (User.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/updateCategories")
        .set("Authorization", `Bearer ${token}`)
        .send({ categories: ["AI"] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });
  });

  describe("POST /updateTimes", () => {
    it("updates the preferred time", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ email: "a@b.com" });
      const res = await request(app)
        .post("/updateTimes")
        .set("Authorization", `Bearer ${token}`)
        .send({ time: ["Morning"] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it("returns code 1 when the user isn't found", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/updateTimes")
        .set("Authorization", `Bearer ${token}`)
        .send({ time: [] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("returns code 1 on unexpected error", async () => {
      (User.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/updateTimes")
        .set("Authorization", `Bearer ${token}`)
        .send({ time: [] });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });
  });

  describe("POST /unsubscribeEmail", () => {
    it("unsubscribes an existing email", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ email: "a@b.com" });
      const res = await request(app)
        .post("/unsubscribeEmail")
        .send({ email: "a@b.com" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it("returns code 1 when the user isn't found", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/unsubscribeEmail")
        .send({ email: "ghost@b.com" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("returns code 1 on unexpected error", async () => {
      (User.findOneAndUpdate as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/unsubscribeEmail")
        .send({ email: "a@b.com" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });
  });

  describe("GET /getIsNewUser", () => {
    it("returns isNewUser for an existing user", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ isNewUser: true });
      const res = await request(app)
        .get("/getIsNewUser")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, isNewUser: true });
    });

    it("returns code 1 when the user isn't found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .get("/getIsNewUser")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("returns code 2 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .get("/getIsNewUser")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(2);
    });
  });

  describe("GET /getUserDetails", () => {
    it("returns user details for an existing user", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        firstName: "A",
        lastName: "B",
        isAdmin: true,
      });
      const res = await request(app)
        .get("/getUserDetails")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 0,
        firstName: "A",
        lastName: "B",
        isAdmin: true,
      });
    });

    it("defaults isAdmin to false when falsy", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({
        firstName: "A",
        lastName: "B",
        isAdmin: undefined,
      });
      const res = await request(app)
        .get("/getUserDetails")
        .set("Authorization", `Bearer ${token}`);
      expect(res.body.isAdmin).toBe(false);
    });

    it("returns code 1 when the user isn't found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .get("/getUserDetails")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("returns code 2 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .get("/getUserDetails")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(2);
    });
  });

  describe("POST /updateAccount", () => {
    it("returns code 1 when the user isn't found", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post("/updateAccount")
        .set("Authorization", `Bearer ${token}`)
        .send({ newFirstName: "New" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(1);
    });

    it("updates first/last name and returns a fresh token", async () => {
      const userDoc: any = {
        _id: "u1",
        email: "user@example.com",
        firstName: "Old",
        lastName: "Name",
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userDoc);

      const res = await request(app)
        .post("/updateAccount")
        .set("Authorization", `Bearer ${token}`)
        .send({ newFirstName: "New", newLastName: "Person" });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(userDoc.firstName).toBe("New");
      expect(userDoc.lastName).toBe("Person");
      expect(userDoc.save).toHaveBeenCalled();
      expect(logActivity).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ activityType: "ACCOUNT_UPDATED" })
      );
    });

    it("ignores blank name fields", async () => {
      const userDoc: any = {
        _id: "u1",
        email: "user@example.com",
        firstName: "Old",
        lastName: "Name",
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findOne as jest.Mock).mockResolvedValue(userDoc);

      await request(app)
        .post("/updateAccount")
        .set("Authorization", `Bearer ${token}`)
        .send({ newFirstName: "   ", newLastName: "" });

      expect(userDoc.firstName).toBe("Old");
      expect(userDoc.lastName).toBe("Name");
    });

    it("returns code 1 when the new email is already taken", async () => {
      const userDoc: any = {
        _id: "u1",
        email: "user@example.com",
        save: jest.fn(),
      };
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(userDoc)
        .mockResolvedValueOnce({ email: "taken@b.com" });

      const res = await request(app)
        .post("/updateAccount")
        .set("Authorization", `Bearer ${token}`)
        .send({ newEmail: "taken@b.com" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        code: 1,
        message: "Account already exist with new email",
      });
      expect(userDoc.save).not.toHaveBeenCalled();
    });

    it("updates the email when it's free and returns a token for the new email", async () => {
      const userDoc: any = {
        _id: "u1",
        email: "user@example.com",
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findOne as jest.Mock)
        .mockResolvedValueOnce(userDoc)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/updateAccount")
        .set("Authorization", `Bearer ${token}`)
        .send({ newEmail: "fresh@b.com" });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.email).toBe("fresh@b.com");
      expect(userDoc.email).toBe("fresh@b.com");
    });

    it("returns code 2 on unexpected error", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("db down"));
      const res = await request(app)
        .post("/updateAccount")
        .set("Authorization", `Bearer ${token}`)
        .send({ newFirstName: "New" });
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(2);
    });
  });
});
