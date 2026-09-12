// Not a *.test.ts file (excluded from testMatch and from coverage), just a
// shared factory for `jest.mock("bullmq", () => createBullmqMock())` calls
// across the job test files. Every job file's `startXJob()` creates a real
// `Queue`/`Worker` at call time, which would otherwise try to talk to Redis
// over the (deliberately non-connecting) redis mock — this replaces bullmq
// entirely so job tests only exercise the job files' own orchestration
// logic, and captures each Worker's processor function so tests can invoke
// it directly instead of going through a real queue.
export function createBullmqMock() {
  // `jest.fn()` wrapping the constructor (not a plain class) is required so
  // `.mock.calls` is available on `Queue`/`Worker` themselves for tests to
  // inspect what a job file constructed them with.
  const Queue = jest.fn().mockImplementation((name: string) => ({
    name,
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
    close: jest.fn().mockResolvedValue(undefined),
  }));

  const Worker = jest.fn().mockImplementation(
    (name: string, processor: (...args: any[]) => any, opts?: any) => ({
      name,
      processor,
      opts,
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })
  );

  return { Queue, Worker };
}

export const fakeJob = (data: any, overrides: Record<string, any> = {}) => ({
  id: "job-1",
  data,
  ...overrides,
});
