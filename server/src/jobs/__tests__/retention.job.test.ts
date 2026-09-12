import { createBullmqMock, fakeJob } from "./bullmqTestUtils";

jest.mock("bullmq", () => createBullmqMock());

jest.mock("../../models/tweet.model", () => ({
  StoredTweets: { updateMany: jest.fn() },
  CustomProfilePosts: { updateMany: jest.fn() },
}));

import { Worker } from "bullmq";
import { StoredTweets, CustomProfilePosts } from "../../models/tweet.model";
import { retentionCleanupQueue } from "../queues";
import {
  startRetentionCleanupJob,
  getRetentionCleanupWorkers,
} from "../retention.job";

const mockedStoredTweets = StoredTweets as unknown as { updateMany: jest.Mock };
const mockedCustomProfilePosts = CustomProfilePosts as unknown as {
  updateMany: jest.Mock;
};
const mockedWorker = Worker as unknown as jest.Mock;

function getProcessor(queueName: string) {
  const call = mockedWorker.mock.calls.find((c: any[]) => c[0] === queueName);
  if (!call) throw new Error(`No Worker constructed for queue "${queueName}"`);
  return call[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedStoredTweets.updateMany.mockResolvedValue({ modifiedCount: 0 });
  mockedCustomProfilePosts.updateMany.mockResolvedValue({ modifiedCount: 0 });
});

it("getRetentionCleanupWorkers returns an empty array before the job has started", () => {
  expect(getRetentionCleanupWorkers()).toEqual([]);
});

describe("startRetentionCleanupJob", () => {
  it("upserts the daily job scheduler", async () => {
    await startRetentionCleanupJob();

    expect(retentionCleanupQueue.upsertJobScheduler).toHaveBeenCalledWith(
      "retention-cleanup:daily",
      { pattern: "0 4 * * *", tz: "America/New_York" },
      { name: "prune-old-posts" }
    );
  });

  it("registers a 'failed' handler that logs the failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await startRetentionCleanupJob();
    const [worker] = getRetentionCleanupWorkers();
    const [, handler] = (worker as any).on.mock.calls.find((c: any[]) => c[0] === "failed");
    handler({ id: "job-x" }, new Error("boom"));
    expect(errorSpy).toHaveBeenCalledWith('[Retention] Job "job-x" failed:', expect.any(Error));
  });
});

describe("retention cleanup worker processor", () => {
  it("prunes tweets older than 7 days from both collections", async () => {
    mockedStoredTweets.updateMany.mockResolvedValue({ modifiedCount: 3 });
    mockedCustomProfilePosts.updateMany.mockResolvedValue({ modifiedCount: 5 });
    await startRetentionCleanupJob();

    const processor = getProcessor("retention-cleanup");
    await processor(fakeJob({}));

    expect(mockedStoredTweets.updateMany).toHaveBeenCalledWith(
      {},
      { $pull: { tweets: { createdAt: { $lt: expect.any(Date) } } } }
    );
    expect(mockedCustomProfilePosts.updateMany).toHaveBeenCalledWith(
      {},
      { $pull: { tweets: { createdAt: { $lt: expect.any(Date) } } } }
    );

    const cutoffArg =
      mockedStoredTweets.updateMany.mock.calls[0][1].$pull.tweets.createdAt.$lt;
    const expectedCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoffArg.getTime() - expectedCutoff)).toBeLessThan(5000);
  });
});
