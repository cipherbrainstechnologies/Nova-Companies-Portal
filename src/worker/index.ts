import "dotenv/config";
import { Worker } from "bullmq";
import { getRedis } from "../server/queue/queues";
import { parseStatementJob } from "../server/statements/statement-service";
import { payrollFacade } from "../server/payroll/payroll-facade";
import { sendEmail } from "../server/email";

const connection = getRedis();

new Worker(
  "statement-parse",
  async (job) => {
    await parseStatementJob(job.data.statementId);
  },
  { connection },
);

new Worker(
  "payslip-generate",
  async (job) => {
    await payrollFacade.generateAndStorePayslip(job.data.payslipId, job.data.version);
  },
  { connection },
);

new Worker(
  "email-notify",
  async (job) => {
    await sendEmail({
      to: job.data.to,
      subject: job.data.subject,
      text: job.data.text,
    });
  },
  { connection },
);

console.log("Nova portal worker started");
