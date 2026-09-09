import { Queue } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;
const queues = new Map<string, Queue>();

function assertRedisUrl(redisUrl: string | undefined): string {
  const url = (redisUrl ?? "").trim();
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("REDIS_URL is required in production");
    }
    return "redis://localhost:6379";
  }
  // Broken Railway variable references often resolve to redis://:@:
  if (!/^rediss?:\/\//i.test(url) || /redis:\/\/:@:?$/i.test(url) || url.includes("://:@")) {
    throw new Error(
      "REDIS_URL is invalid. On Railway, set REDIS_URL to a Variable Reference of Redis → REDIS_URL (not a blank shared var).",
    );
  }
  try {
    new URL(url);
  } catch {
    throw new Error("REDIS_URL is not a valid URL");
  }
  return url;
}

export function getRedis() {
  if (!connection) {
    const redisUrl = assertRedisUrl(process.env.REDIS_URL);
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

function getQueue<Data>(name: string): Queue<Data> {
  const existing = queues.get(name);
  if (existing) return existing as Queue<Data>;
  const created = new Queue<Data>(name, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    },
  });
  queues.set(name, created);
  return created;
}

export type StatementParseJob = { statementId: string };
export type PayslipJobData = {
  payslipId: string;
  payrollRunId?: string;
  payrollLineId?: string;
  version?: number;
};
export type PayslipGenerateJob = PayslipJobData;
export type EmailNotifyJob = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Set for payslip notifications so the worker can record delivery outcome. */
  deliveryId?: string;
};

/** Lazy proxies so importing this module never opens Redis until a job is enqueued. */
export const statementParseQueue = {
  add: (...args: Parameters<Queue<StatementParseJob>["add"]>) =>
    getQueue<StatementParseJob>("statement-parse").add(...args),
};

export const payslipGenerateQueue = {
  add: (...args: Parameters<Queue<PayslipGenerateJob>["add"]>) =>
    getQueue<PayslipGenerateJob>("payslip-generate").add(...args),
};

export const emailNotifyQueue = {
  add: (...args: Parameters<Queue<EmailNotifyJob>["add"]>) =>
    getQueue<EmailNotifyJob>("email-notify").add(...args),
};

export function enqueuePayslipJob(data: PayslipJobData) {
  return payslipGenerateQueue.add("generate-payslip", data, {
    jobId: `payslip-${data.payslipId}-${data.version ?? "current"}`,
  });
}
