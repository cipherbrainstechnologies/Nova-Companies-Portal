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
    try {
      await sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        text: job.data.text,
        html: job.data.html,
      });
      if (job.data.deliveryId) {
        await payrollFacade.markEmailDelivery({
          deliveryId: job.data.deliveryId,
          status: "SENT",
        });
      }
    } catch (error) {
      if (job.data.deliveryId) {
        // A failed notification never reverses the issued payslip.
        await payrollFacade.markEmailDelivery({
          deliveryId: job.data.deliveryId,
          status: "FAILED",
          failureReason: error instanceof Error ? error.message : "Email send failed",
        });
      }
      throw error;
    }
  },
  { connection },
);

console.log("Nova portal worker started");
