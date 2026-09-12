import mongoose from "mongoose";
import { Bookmark } from "../bookmark.model";

describe("Bookmark model", () => {
  it("is registered with the correct model name and collection", () => {
    expect(Bookmark.modelName).toBe("Bookmark");
    expect(Bookmark.collection.name).toBe("bookmarks");
  });

  it("fails validation when required fields are missing", () => {
    const bookmark = new Bookmark({});
    const err = bookmark.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.user).toBeDefined();
    expect(err!.errors.tweetId).toBeDefined();
    expect(err!.errors.link).toBeDefined();
  });

  it("passes validation when required fields are present", () => {
    const bookmark = new Bookmark({
      user: new mongoose.Types.ObjectId(),
      tweetId: "tweet-1",
      link: "https://x.com/someuser/status/1",
    });

    const err = bookmark.validateSync();
    expect(err).toBeUndefined();
  });

  it("does not require username", () => {
    const bookmark = new Bookmark({
      user: new mongoose.Types.ObjectId(),
      tweetId: "tweet-1",
      link: "https://x.com/someuser/status/1",
    });

    expect(bookmark.username).toBeUndefined();
    expect(bookmark.validateSync()).toBeUndefined();
  });

  it("defaults createdAt to the current time", () => {
    const before = Date.now();
    const bookmark = new Bookmark({
      user: new mongoose.Types.ObjectId(),
      tweetId: "tweet-1",
      link: "https://x.com/someuser/status/1",
    });
    const after = Date.now();

    expect(bookmark.createdAt).toBeInstanceOf(Date);
    expect(bookmark.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(bookmark.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("configures a unique compound index on user + tweetId", () => {
    const indexes = Bookmark.schema.indexes();
    const compound = indexes.find(
      ([fields]) =>
        Object.prototype.hasOwnProperty.call(fields, "user") &&
        Object.prototype.hasOwnProperty.call(fields, "tweetId")
    );

    expect(compound).toBeDefined();
    const [, options] = compound as [Record<string, unknown>, Record<string, unknown>];
    expect(options.unique).toBe(true);
  });
});
