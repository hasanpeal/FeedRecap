import { createBullmqMock, fakeJob } from "./bullmqTestUtils";

jest.mock("bullmq", () => createBullmqMock());

jest.mock("../../models/user.model", () => ({
  User: { find: jest.fn(), findById: jest.fn() },
}));

jest.mock("../../services/newsletter.service", () => ({
  fetchTweetsForCategories: jest.fn(),
  generateNewsletter: jest.fn(),
  getStoredTweetsForUser: jest.fn(),
  generateCustomProfileNewsletter: jest.fn(),
  sendNewsletterEmail: jest.fn(),
  isValidEmail: jest.fn(),
}));

import { Worker } from "bullmq";
import { User } from "../../models/user.model";
import * as newsletterService from "../../services/newsletter.service";
import { newsletterQueue, newsletterTaskQueue } from "../queues";
import {
  startNewsletterScheduler,
  getNewsletterWorkers,
} from "../newsletter.job";

const mockedUser = User as unknown as { find: jest.Mock; findById: jest.Mock };
const mockedService = newsletterService as jest.Mocked<typeof newsletterService>;
const mockedWorker = Worker as unknown as jest.Mock;

// Grabs the processor function a Worker was constructed with for a given
// queue name, by scanning the mocked bullmq Worker constructor's calls.
// Uses the same `Worker` binding newsletter.job.ts itself imported (a top
// level `import`, resolved once) rather than a fresh `require("bullmq")`,
// which would resolve to a different mock instance after `resetModules`.
function getProcessor(queueName: string) {
  const call = mockedWorker.mock.calls.find((c: any[]) => c[0] === queueName);
  if (!call) throw new Error(`No Worker constructed for queue "${queueName}"`);
  return call[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedService.isValidEmail.mockReturnValue(true);
});

// Runs before `startNewsletterScheduler()` is ever called anywhere else in
// this file — the module-level `newsletterWorker`/`newsletterTaskWorker`
// variables are otherwise permanently assigned for the rest of the suite.
it("getNewsletterWorkers returns an empty array before the scheduler has started", () => {
  expect(getNewsletterWorkers()).toEqual([]);
});

describe("startNewsletterScheduler", () => {
  it("upserts a job scheduler for each of the 3 daily time slots", async () => {
    await startNewsletterScheduler();

    expect(newsletterQueue.upsertJobScheduler).toHaveBeenCalledTimes(3);
    expect(newsletterQueue.upsertJobScheduler).toHaveBeenCalledWith(
      "newsletter:Morning",
      { pattern: "0 9 * * *", tz: "America/New_York" },
      { name: "send-newsletter-batch", data: { timeSlot: "Morning" } }
    );
  });

  it("registers a 'failed' handler on both workers that logs the failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await startNewsletterScheduler();
    const workers = getNewsletterWorkers();
    expect(workers).toHaveLength(2);
    workers.forEach((w: any) => {
      expect(w.on).toHaveBeenCalledWith("failed", expect.any(Function));
      const [, handler] = w.on.mock.calls.find((c: any[]) => c[0] === "failed");
      handler({ id: "job-x" }, new Error("boom"));
    });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });
});

describe("newsletter dispatch worker (NEWSLETTER queue processor)", () => {
  it("logs and does nothing when no users match the time slot", async () => {
    mockedUser.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    await startNewsletterScheduler();

    const processor = getProcessor("newsletter");
    await processor(fakeJob({ timeSlot: "Morning" }));

    expect(newsletterTaskQueue.add).not.toHaveBeenCalled();
  });

  it("skips users with an invalid email or no time preferences, dispatches the rest", async () => {
    mockedUser.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { _id: "u1", email: "bad-email", time: ["Morning"] },
        { _id: "u2", email: "good@example.com", time: [] },
        { _id: "u3", email: "good@example.com", time: ["Morning"] },
      ]),
    });
    mockedService.isValidEmail.mockImplementation((email: string) => email === "good@example.com");
    await startNewsletterScheduler();

    const processor = getProcessor("newsletter");
    await processor(fakeJob({ timeSlot: "Morning" }));

    expect(newsletterTaskQueue.add).toHaveBeenCalledTimes(1);
    expect(newsletterTaskQueue.add).toHaveBeenCalledWith(
      "send-newsletter",
      { userId: "u3", timeSlot: "Morning" },
      expect.objectContaining({ jobId: expect.stringContaining("newsletter-Morning-") })
    );
  });
});

describe("newsletter task worker (NEWSLETTER_TASK queue processor)", () => {
  it("warns and skips when the user no longer exists", async () => {
    mockedUser.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await startNewsletterScheduler();

    const processor = getProcessor("newsletter-task");
    await processor(fakeJob({ userId: "gone", timeSlot: "Morning" }));

    expect(mockedService.fetchTweetsForCategories).not.toHaveBeenCalled();
    expect(mockedService.sendNewsletterEmail).not.toHaveBeenCalled();
  });

  it("generates and sends a category-wise newsletter for a categorywise user", async () => {
    const user = { _id: "u1", wise: "categorywise", categories: ["Tech"] };
    mockedUser.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
    mockedService.fetchTweetsForCategories.mockResolvedValue({
      tweetsByCategory: [],
      top15Tweets: [],
    });
    mockedService.generateNewsletter.mockResolvedValue("<p>newsletter</p>");
    await startNewsletterScheduler();

    const processor = getProcessor("newsletter-task");
    await processor(fakeJob({ userId: "u1", timeSlot: "Morning" }));

    expect(mockedService.fetchTweetsForCategories).toHaveBeenCalledWith(["Tech"]);
    expect(mockedService.sendNewsletterEmail).toHaveBeenCalledWith(user, "<p>newsletter</p>");
  });

  it("generates and sends a custom-profile newsletter for a customProfiles user", async () => {
    const user = { _id: "u2", wise: "customProfiles" };
    mockedUser.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
    mockedService.getStoredTweetsForUser.mockResolvedValue({
      tweetsByProfiles: [],
      top15Tweets: [],
    });
    mockedService.generateCustomProfileNewsletter.mockResolvedValue("<p>profile digest</p>");
    await startNewsletterScheduler();

    const processor = getProcessor("newsletter-task");
    await processor(fakeJob({ userId: "u2", timeSlot: "Night" }));

    expect(mockedService.getStoredTweetsForUser).toHaveBeenCalledWith("u2");
    expect(mockedService.sendNewsletterEmail).toHaveBeenCalledWith(user, "<p>profile digest</p>");
  });

  it("does not send an email when newsletter generation yields nothing", async () => {
    const user = { _id: "u3", wise: "categorywise", categories: [] };
    mockedUser.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
    mockedService.fetchTweetsForCategories.mockResolvedValue({
      tweetsByCategory: [],
      top15Tweets: [],
    });
    mockedService.generateNewsletter.mockResolvedValue(undefined);
    await startNewsletterScheduler();

    const processor = getProcessor("newsletter-task");
    await processor(fakeJob({ userId: "u3", timeSlot: "Morning" }));

    expect(mockedService.sendNewsletterEmail).not.toHaveBeenCalled();
  });
});
