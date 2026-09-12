import { StoredTweets, CustomProfilePosts } from "../tweet.model";

const validTweet = {
  text: "hello world",
  likes: 5,
  tweet_id: "123",
  createdAt: new Date(),
};

describe("StoredTweets model", () => {
  it("is registered with the correct model name and collection", () => {
    expect(StoredTweets.modelName).toBe("StoredTweets");
    expect(StoredTweets.collection.name).toBe("storedtweets");
  });

  it("fails validation when required top-level fields are missing", () => {
    const doc = new StoredTweets({});
    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.category).toBeDefined();
    expect(err!.errors.screenName).toBeDefined();
  });

  it("passes validation with required fields present", () => {
    const doc = new StoredTweets({
      category: "Tech",
      screenName: "someuser",
      tweets: [validTweet],
    });

    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it("fails validation when a nested tweet is missing required fields", () => {
    const doc = new StoredTweets({
      category: "Tech",
      screenName: "someuser",
      tweets: [{}],
    });

    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err!.errors["tweets.0.text"]).toBeDefined();
    expect(err!.errors["tweets.0.likes"]).toBeDefined();
    expect(err!.errors["tweets.0.tweet_id"]).toBeDefined();
    expect(err!.errors["tweets.0.createdAt"]).toBeDefined();
  });

  it("does not require a quotedTweet on each tweet", () => {
    const doc = new StoredTweets({
      category: "Tech",
      screenName: "someuser",
      tweets: [validTweet],
    });

    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it("defaults createdAt to the current time", () => {
    const doc = new StoredTweets({
      category: "Tech",
      screenName: "someuser",
    });

    expect(doc.createdAt).toBeInstanceOf(Date);
  });
});

describe("CustomProfilePosts model", () => {
  it("is registered with the correct model name and collection", () => {
    expect(CustomProfilePosts.modelName).toBe("CustomProfilePosts");
    expect(CustomProfilePosts.collection.name).toBe("customprofileposts");
  });

  it("fails validation when screenName is missing", () => {
    const doc = new CustomProfilePosts({});
    const err = doc.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.screenName).toBeDefined();
  });

  it("passes validation with required fields present", () => {
    const doc = new CustomProfilePosts({
      screenName: "someuser",
      tweets: [validTweet],
    });

    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it("is a distinct model from StoredTweets", () => {
    expect(CustomProfilePosts).not.toBe(StoredTweets as unknown);
    expect(CustomProfilePosts.modelName).not.toBe(StoredTweets.modelName);
  });
});
