import mongoose from "mongoose";
import { User } from "../user.model";

describe("User model", () => {
  it("is registered with the correct model name and collection", () => {
    expect(User.modelName).toBe("User");
    expect(User.collection.name).toBe("users");
  });

  it("fails validation when required fields are missing", () => {
    const user = new User({});
    const err = user.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.firstName).toBeDefined();
    expect(err!.errors.email).toBeDefined();
  });

  it("passes validation when required fields are present", () => {
    const user = new User({
      firstName: "Ada",
      email: "ada@example.com",
    });

    const err = user.validateSync();
    expect(err).toBeUndefined();
  });

  it("applies documented defaults", () => {
    const user = new User({
      firstName: "Ada",
      email: "ada@example.com",
    });

    expect(user.isNewUser).toBe(false);
    expect(user.isAdmin).toBe(false);
    expect(user.time).toEqual(["Morning", "Afternoon", "Night"]);
    expect(user.newsletter).toBe(
      "Thank you for signing up. Please wait for your first newsletter to generate"
    );
    expect(user.categories).toEqual([
      "Politics",
      "Geopolitics",
      "Finance",
      "AI",
      "Tech",
      "Crypto",
      "Meme",
      "Sports",
      "Entertainment",
    ]);
    expect(user.totalnewsletter).toBe(0);
    expect(user.wise).toBe("categorywise");
    expect(user.profiles).toEqual([]);
    expect(user.twitterUsername).toBeNull();
  });

  it("accepts a valid wise enum value", () => {
    const user = new User({
      firstName: "Ada",
      email: "ada@example.com",
      wise: "customProfiles",
    });

    const err = user.validateSync();
    expect(err).toBeUndefined();
  });

  it("rejects an invalid wise enum value", () => {
    const user = new User({
      firstName: "Ada",
      email: "ada@example.com",
      wise: "notARealOption",
    });

    const err = user.validateSync();
    expect(err).toBeDefined();
    expect(err!.errors.wise).toBeDefined();
  });

  it("does not require lastName, password, or timezone", () => {
    const user = new User({
      firstName: "Ada",
      email: "ada@example.com",
    });

    const err = user.validateSync();
    expect(err).toBeUndefined();
    expect(user.lastName).toBeUndefined();
    expect(user.password).toBeUndefined();
  });

  it("uses the shared mongoose connection", () => {
    expect(User.db).toBeInstanceOf(mongoose.Connection);
  });
});
