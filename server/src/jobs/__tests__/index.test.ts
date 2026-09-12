jest.mock("../tweetFetch.job");
jest.mock("../newsletter.job");
jest.mock("../weeklyDigest.job");
jest.mock("../retention.job");
jest.mock("../queues", () => ({
  allQueues: [{ close: jest.fn().mockResolvedValue(undefined) }],
}));
jest.mock("../../config/redis", () => ({
  __esModule: true,
  default: { disconnect: jest.fn() },
  closeRedisConnection: jest.fn().mockResolvedValue(undefined),
}));

import { startTweetFetchJob, getTweetFetchWorkers } from "../tweetFetch.job";
import {
  startNewsletterScheduler,
  getNewsletterWorkers,
} from "../newsletter.job";
import {
  startWeeklyDigestJob,
  getWeeklyDigestWorkers,
} from "../weeklyDigest.job";
import {
  startRetentionCleanupJob,
  getRetentionCleanupWorkers,
} from "../retention.job";
import { allQueues } from "../queues";
import { closeRedisConnection } from "../../config/redis";
import { startBackgroundJobs, stopBackgroundJobs } from "../index";

const mocked = <T extends (...args: any[]) => any>(fn: T) =>
  fn as jest.MockedFunction<T>;

describe("jobs/index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked(startTweetFetchJob).mockResolvedValue(undefined);
    mocked(startNewsletterScheduler).mockResolvedValue(undefined);
    mocked(startWeeklyDigestJob).mockResolvedValue(undefined);
    mocked(startRetentionCleanupJob).mockResolvedValue(undefined);
    mocked(getTweetFetchWorkers).mockReturnValue([]);
    mocked(getNewsletterWorkers).mockReturnValue([]);
    mocked(getWeeklyDigestWorkers).mockReturnValue([]);
    mocked(getRetentionCleanupWorkers).mockReturnValue([]);
  });

  describe("startBackgroundJobs", () => {
    it("starts every job scheduler", () => {
      startBackgroundJobs();

      expect(startTweetFetchJob).toHaveBeenCalledTimes(1);
      expect(startNewsletterScheduler).toHaveBeenCalledTimes(1);
      expect(startWeeklyDigestJob).toHaveBeenCalledTimes(1);
      expect(startRetentionCleanupJob).toHaveBeenCalledTimes(1);
    });

    it("logs rather than throws when a scheduler fails to start", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      mocked(startTweetFetchJob).mockRejectedValue(new Error("boom"));

      expect(() => startBackgroundJobs()).not.toThrow();
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[TweetFetch] Failed to start job:",
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it("logs rather than throws when the newsletter, weekly digest, or retention scheduler fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      mocked(startNewsletterScheduler).mockRejectedValue(new Error("n"));
      mocked(startWeeklyDigestJob).mockRejectedValue(new Error("w"));
      mocked(startRetentionCleanupJob).mockRejectedValue(new Error("r"));

      expect(() => startBackgroundJobs()).not.toThrow();
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Newsletter] Failed to start scheduler:",
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[WeeklyDigest] Failed to start job:",
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Retention] Failed to start job:",
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("stopBackgroundJobs", () => {
    it("closes every worker, every queue, and the redis connection", async () => {
      const tweetWorker = { close: jest.fn().mockResolvedValue(undefined) };
      const newsletterWorker = { close: jest.fn().mockResolvedValue(undefined) };
      const digestWorker = { close: jest.fn().mockResolvedValue(undefined) };
      const retentionWorker = { close: jest.fn().mockResolvedValue(undefined) };
      mocked(getTweetFetchWorkers).mockReturnValue([tweetWorker as any]);
      mocked(getNewsletterWorkers).mockReturnValue([newsletterWorker as any]);
      mocked(getWeeklyDigestWorkers).mockReturnValue([digestWorker as any]);
      mocked(getRetentionCleanupWorkers).mockReturnValue([retentionWorker as any]);

      await stopBackgroundJobs();

      expect(tweetWorker.close).toHaveBeenCalledTimes(1);
      expect(newsletterWorker.close).toHaveBeenCalledTimes(1);
      expect(digestWorker.close).toHaveBeenCalledTimes(1);
      expect(retentionWorker.close).toHaveBeenCalledTimes(1);
      for (const queue of allQueues) {
        expect(queue.close).toHaveBeenCalledTimes(1);
      }
      expect(closeRedisConnection).toHaveBeenCalledTimes(1);
    });

    it("closes cleanly when there are no active workers", async () => {
      await expect(stopBackgroundJobs()).resolves.toBeUndefined();
      expect(closeRedisConnection).toHaveBeenCalledTimes(1);
    });
  });
});
