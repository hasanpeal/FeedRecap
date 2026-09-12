import mongoose from "mongoose";
import { AuditLog } from "../auditLog.model";

describe("AuditLog model", () => {
  it("is registered with the correct model name and collection", () => {
    expect(AuditLog.modelName).toBe("AuditLog");
    expect(AuditLog.collection.name).toBe("auditlogs");
  });

  it("fails validation when required fields are missing", () => {
    const log = new AuditLog({});
    const err = log.validateSync();

    expect(err).toBeDefined();
    expect(err!.errors.activityType).toBeDefined();
    expect(err!.errors.activityDescription).toBeDefined();
  });

  it("passes validation when required fields are present", () => {
    const log = new AuditLog({
      activityType: "LOGIN",
      activityDescription: "User logged in",
    });

    const err = log.validateSync();
    expect(err).toBeUndefined();
  });

  it("does not require userId, email, page, ipAddress, or userAgent", () => {
    const log = new AuditLog({
      activityType: "PAGE_VISIT",
      activityDescription: "Visited dashboard",
    });

    expect(log.userId).toBeUndefined();
    expect(log.email).toBeUndefined();
    expect(log.page).toBeUndefined();
    expect(log.ipAddress).toBeUndefined();
    expect(log.userAgent).toBeUndefined();
    expect(log.validateSync()).toBeUndefined();
  });

  it("defaults metadata to an empty object", () => {
    const log = new AuditLog({
      activityType: "LOGIN",
      activityDescription: "User logged in",
    });

    expect(log.metadata).toEqual({});
  });

  it("accepts an arbitrary metadata object", () => {
    const log = new AuditLog({
      activityType: "CATEGORIES_UPDATED",
      activityDescription: "Categories changed",
      metadata: { before: ["AI"], after: ["AI", "Tech"] },
    });

    expect(log.metadata).toEqual({ before: ["AI"], after: ["AI", "Tech"] });
    expect(log.validateSync()).toBeUndefined();
  });

  it("accepts a userId reference to a User document", () => {
    const userId = new mongoose.Types.ObjectId();
    const log = new AuditLog({
      userId,
      activityType: "ACCOUNT_UPDATED",
      activityDescription: "Profile updated",
    });

    expect(log.userId).toEqual(userId);
    expect(log.validateSync()).toBeUndefined();
  });

  it("has timestamps enabled (createdAt/updatedAt managed automatically)", () => {
    expect((AuditLog.schema as mongoose.Schema).get("timestamps")).toBe(true);
  });

  it("configures indexes on activityType, email, userId, and createdAt", () => {
    const indexes = AuditLog.schema.indexes();
    const hasFieldIndex = (field: string) =>
      indexes.some(([fields]) =>
        Object.prototype.hasOwnProperty.call(fields, field)
      );

    expect(hasFieldIndex("activityType")).toBe(true);
    expect(hasFieldIndex("email")).toBe(true);
    expect(hasFieldIndex("userId")).toBe(true);
    expect(hasFieldIndex("createdAt")).toBe(true);
  });
});
