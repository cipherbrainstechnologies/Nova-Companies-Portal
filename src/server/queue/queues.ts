import { Queue } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;

export function getRedis() {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl && process.env.NODE_ENV === "production") {
      throw new Error("REDIS_URL is required in production");
    }
    connection = new IORedis(redisUrl ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

function q<Data>(name: string) {
  return new Queue<Data>(name, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    },
  });
}

export type StatementParseJob = { statementId: string };
export type PayslipJobData = {
  payslipId: string;
  payrollRunId?: string;
  payrollLineId?: string;
  version?: number;
};
export type PayslipGenerateJob = PayslipJobData;
export type EmailNotifyJob = { to: string; subject: string; text: string };

export const statementParseQueue = q<StatementParseJob>("statement-parse");
export const payslipGenerateQueue = q<PayslipGenerateJob>("payslip-generate");
export const emailNotifyQueue = q<EmailNotifyJob>("email-notify");

export function enqueuePayslipJob(data: PayslipJobData) {
  return payslipGenerateQueue.add("generate-payslip", data, {
    jobId: `payslip-${data.payslipId}-${data.version ?? "current"}`,
  });
}
