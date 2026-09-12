import { INSTANCE_ID } from "../instanceId";

describe("INSTANCE_ID", () => {
  it("is a stable, non-empty string combining hostname and pid", () => {
    expect(typeof INSTANCE_ID).toBe("string");
    expect(INSTANCE_ID.length).toBeGreaterThan(0);
    expect(INSTANCE_ID).toContain(`:${process.pid}`);
    // Re-importing the (cached) module should yield the same value.
    expect(require("../instanceId").INSTANCE_ID).toBe(INSTANCE_ID);
  });
});
