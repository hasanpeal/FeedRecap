import { createBullmqMock, fakeJob } from "./bullmqTestUtils";

jest.mock("bullmq", () => createBullmqMock());

jest.mock("../../models/user.model", () => ({
  User: { find: jest.fn() },
}));

jest.mock("../../services/twitter.service", () => ({
  fetchAndStoreTweets: jest.fn(),
  fetchAndStoreTweetsForProfiles: jest.fn(),
}));

import { Worker } from "bullmq";
import { User } from "../../models/user.model";
import * as twitterService from "../../services/twitter.service";
import { tweetFetchQueue, tweetFetchTaskQueue } from "../queues";
import { startTweetFetchJob, getTweetFetchWorkers } from "../tweetFetch.job";

const mockedUser = User as unknown as { find: jest.Mock };
const mockedService = twitterService as jest.Mocked<typeof twitterService>;
const mockedWorker = Worker as unknown as jest.Mock;

function getProcessor(queueName: string) {
  const call = mockedWorker.mock.calls.find((c: any[]) => c[0] === queueName);
  if (!call) throw new Error(`No Worker constructed for queue "${queueName}"`);
  return call[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUser.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
});

it("getTweetFetchWorkers returns an empty array before the job has started", () => {
  expect(getTweetFetchWorkers()).toEqual([]);
});

describe("startTweetFetchJob", () => {
  it("upserts the hourly job scheduler", async () => {
    await startTweetFetchJob();

    expect(tweetFetchQueue.upsertJobScheduler).toHaveBeenCalledWith(
      "tweet-fetch:hourly",
      { pattern: "0 0-8,10-14,16-19,21-23 * * *", tz: "America/New_York" },
      { name: "fetch-tweets" }
    );
  });

  it("registers 'failed' handlers on both workers that log the failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await startTweetFetchJob();
    const workers = getTweetFetchWorkers();
    expect(workers).toHaveLength(2);
    workers.forEach((w: any) => {
      const [, handler] = w.on.mock.calls.find((c: any[]) => c[0] === "failed");
      handler({ id: "job-x" }, new Error("boom"));
    });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});

describe("tweet-fetch dispatch worker (TWEET_FETCH queue processor)", () => {
  it("dispatches one task per hardcoded category and one per unique custom profile", async () => {
    mockedUser.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { profiles: ["elonmusk", "shared"] },
        { profiles: ["shared", "another"] },
      ]),
    });
    await startTweetFetchJob();

    const processor = getProcessor("tweet-fetch");
    await processor(fakeJob({}));

    // 9 hardcoded categories + 3 unique profiles (elonmusk, shared, another)
    expect(tweetFetchTaskQueue.add).toHaveBeenCalledTimes(12);
    expect(tweetFetchTaskQueue.add).toHaveBeenCalledWith(
      "fetch-category",
      { type: "category", category: "Politics" },
      expect.objectContaining({ jobId: expect.stringContaining("category-Politics") })
    );
    expect(tweetFetchTaskQueue.add).toHaveBeenCalledWith(
      "fetch-profile",
      { type: "profile", profile: "elonmusk" },
      expect.objectContaining({ jobId: expect.stringContaining("profile-elonmusk") })
    );
  });

  it("dedupes a profile followed by multiple users into a single task", async () => {
    mockedUser.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { profiles: ["shared"] },
        { profiles: ["shared"] },
      ]),
    });
    await startTweetFetchJob();

    const processor = getProcessor("tweet-fetch");
    await processor(fakeJob({}));

    const profileCalls = (tweetFetchTaskQueue.add as jest.Mock).mock.calls.filter(
      (c: any[]) => c[0] === "fetch-profile"
    );
    expect(profileCalls).toHaveLength(1);
  });
});

describe("tweet-fetch task worker (TWEET_FETCH_TASK queue processor)", () => {
  it("fetches by category for a category-type task", async () => {
    await startTweetFetchJob();
    const processor = getProcessor("tweet-fetch-task");

    await processor(fakeJob({ type: "category", category: "AI" }));

    expect(mockedService.fetchAndStoreTweets).toHaveBeenCalledWith(["AI"]);
    expect(mockedService.fetchAndStoreTweetsForProfiles).not.toHaveBeenCalled();
  });

  it("fetches by profile for a profile-type task", async () => {
    await startTweetFetchJob();
    const processor = getProcessor("tweet-fetch-task");

    await processor(fakeJob({ type: "profile", profile: "elonmusk" }));

    expect(mockedService.fetchAndStoreTweetsForProfiles).toHaveBeenCalledWith(["elonmusk"]);
    expect(mockedService.fetchAndStoreTweets).not.toHaveBeenCalled();
  });
});
