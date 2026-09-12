import mongoose from "mongoose";
import { Newsletter } from "../newsletter.model";

describe("Newsletter model", () => {
  it("is registered with the correct model name and collection", () => {
    expect(Newsletter.modelName).toBe("Newsletter");
    expect(Newsletter.collection.name).toBe("newsletters");
  });

  it("fails validation when required fields are missing", () => {
    const newsletter = new Newsletter({});
    const err = newsletter.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.user).toBeDefined();
    expect(err!.errors.content).toBeDefined();
  });

  it("passes validation when required fields are present", () => {
    const newsletter = new Newsletter({
      user: new mongoose.Types.ObjectId(),
      content: "Some newsletter content",
    });

    const err = newsletter.validateSync();
    expect(err).toBeUndefined();
  });

  it("defaults createdAt to the current time", () => {
    const before = Date.now();
    const newsletter = new Newsletter({
      user: new mongoose.Types.ObjectId(),
      content: "Some newsletter content",
    });
    const after = Date.now();

    expect(newsletter.createdAt).toBeInstanceOf(Date);
    expect(newsletter.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(newsletter.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("configures a TTL index on createdAt", () => {
    const indexes = Newsletter.schema.indexes();
    const ttlIndex = indexes.find(
      ([fields]) => Object.prototype.hasOwnProperty.call(fields, "createdAt")
    );

    expect(ttlIndex).toBeDefined();
    const [, options] = ttlIndex as [Record<string, unknown>, Record<string, unknown>];
    expect(options.expireAfterSeconds).toBe(7 * 24 * 60 * 60);
  });
});
