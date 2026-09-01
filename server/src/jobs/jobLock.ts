import os from "os";
import { JobLock } from "../models/jobLockModel";

const INSTANCE_ID = `${os.hostname()}:${process.pid}`;
const STALE_LOCK_MS = 15 * 60 * 1000; // a crashed replica shouldn't block a job forever

/**
 * Atomically claims a scheduled job run so that when multiple server
 * replicas are running (e.g. behind a load balancer), only one of them
 * actually executes the job for a given `jobKey`.
 *
 * `jobKey` must uniquely identify a single occurrence of the job (e.g.
 * `newsletter:Morning:2026-08-31`). Relies on the unique index on
 * `jobKey`: the upsert either creates the lock document (first replica to
 * get there wins) or matches an existing-but-stale/failed lock to steal it;
 * any other case throws a duplicate key error, which we treat as "another
 * replica already owns this run."
 */
export async function acquireJobLock(jobKey: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  try {
    await JobLock.findOneAndUpdate(
      {
        jobKey,
        $or: [
          { status: "running", lockedAt: { $lt: staleBefore } },
          { status: "failed" },
        ],
      },
      {
        $set: { lockedBy: INSTANCE_ID, lockedAt: new Date(), status: "running" },
        $setOnInsert: { jobKey },
      },
      { upsert: true }
    );
    return true;
  } catch (error: any) {
    if (error?.code === 11000) {
      return false; // another replica already holds/completed this job run
    }
    throw error;
  }
}

export async function releaseJobLock(
  jobKey: string,
  status: "completed" | "failed"
): Promise<void> {
  try {
    await JobLock.updateOne(
      { jobKey, lockedBy: INSTANCE_ID },
      { $set: { status, completedAt: new Date() } }
    );
  } catch (error) {
    console.error(`❌ [JobLock]: Failed to release lock "${jobKey}":`, error);
  }
}

/**
 * Runs `fn` only if this replica wins the lock for `jobKey`. Marks the lock
 * completed/failed when done so a genuinely crashed run can be retried
 * later (see STALE_LOCK_MS), instead of blocking that job key forever.
 * Returns whether this replica actually ran the job.
 */
export async function runIfLeader(
  jobKey: string,
  fn: () => Promise<void>
): Promise<boolean> {
  const acquired = await acquireJobLock(jobKey);
  if (!acquired) {
    return false;
  }

  try {
    await fn();
    await releaseJobLock(jobKey, "completed");
  } catch (error) {
    await releaseJobLock(jobKey, "failed");
    throw error;
  }

  return true;
}
