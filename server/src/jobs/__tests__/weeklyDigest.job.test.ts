import { createBullmqMock, fakeJob } from "./bullmqTestUtils";

jest.mock("bullmq", () => createBullmqMock());

jest.mock("../../models/user.model", () => ({
  User: { countDocuments: jest.fn() },
}));

jest.mock("../../services/email.service", () => ({
  ADMIN_ALERT_RECIPIENTS: ["admin@example.com"],
  sendAdminAlert: jest.fn(),
}));

import { Worker } from "bullmq";
import { User } from "../../models/user.model";
import * as emailService from "../../services/email.service";
import { weeklyDigestQueue } from "../queues";
import { startWeeklyDigestJob, getWeeklyDigestWorkers } from "../weeklyDigest.job";

const mockedUser = User as unknown as { countDocuments: jest.Mock };
const mockedEmailService = emailService as jest.Mocked<typeof emailService>;
const mockedWorker = Worker as unknown as jest.Mock;

function getProcessor(queueName: string) {
  const call = mockedWorker.mock.calls.find((c: any[]) => c[0] === queueName);
  if (!call) throw new Error(`No Worker constructed for queue "${queueName}"`);
  return call[1];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUser.countDocuments.mockResolvedValue(0);
});

it("getWeeklyDigestWorkers returns an empty array before the job has started", () => {
  expect(getWeeklyDigestWorkers()).toEqual([]);
});

describe("startWeeklyDigestJob", () => {
  it("upserts the Monday-9am job scheduler", async () => {
    await startWeeklyDigestJob();

    expect(weeklyDigestQueue.upsertJobScheduler).toHaveBeenCalledWith(
      "weekly-digest:monday",
      { pattern: "0 9 * * 1", tz: "America/New_York" },
      { name: "send-weekly-digest" }
    );
  });

  it("registers a 'failed' handler that logs the failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await startWeeklyDigestJob();
    const [worker] = getWeeklyDigestWorkers();
    const [, handler] = (worker as any).on.mock.calls.find((c: any[]) => c[0] === "failed");
    handler({ id: "job-x" }, new Error("boom"));
    expect(errorSpy).toHaveBeenCalledWith('[WeeklyDigest] Job "job-x" failed:', expect.any(Error));
  });
});

describe("weekly digest worker processor", () => {
  it("counts users and sends the digest alert with the count in the message", async () => {
    mockedUser.countDocuments.mockResolvedValue(42);
    await startWeeklyDigestJob();

    const processor = getProcessor("weekly-digest");
    await processor(fakeJob({}));

    expect(mockedUser.countDocuments).toHaveBeenCalledWith({});
    expect(mockedEmailService.sendAdminAlert).toHaveBeenCalledWith(
      ["admin@example.com"],
      expect.stringContaining("total user count"),
      expect.stringContaining("42")
    );
  });
});
