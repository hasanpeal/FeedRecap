import { createBullmqMock } from "./bullmqTestUtils";

jest.mock("bullmq", () => createBullmqMock());

import { QUEUE_NAMES, allQueues } from "../queues";

describe("queues", () => {
  it("names every queue uniquely", () => {
    const names = Object.values(QUEUE_NAMES);
    expect(new Set(names).size).toBe(names.length);
  });

  it("exposes every constructed queue in allQueues", () => {
    expect(allQueues).toHaveLength(Object.keys(QUEUE_NAMES).length);
    const allQueueNames = allQueues.map((q: any) => q.name).sort();
    expect(allQueueNames).toEqual(Object.values(QUEUE_NAMES).sort());
  });
});
