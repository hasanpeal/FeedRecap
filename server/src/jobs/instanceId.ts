import os from "os";

// Multiple Railway replicas run these job schedulers redundantly, so each
// scheduled occurrence must run exactly once. Every replica upserting the
// same BullMQ Job Scheduler (id + cron pattern) at boot is idempotent — only
// one scheduled series is created network-wide — and Redis's atomic dequeue
// means only one replica's Worker ever picks up a given occurrence. This ID
// is just used in logs to identify which replica claimed a given occurrence.
export const INSTANCE_ID = `${os.hostname()}:${process.pid}`;
