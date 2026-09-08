import { nanoid } from "nanoid";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { amountInWordsInr } from "@/server/payroll/amount-in-words";
import { renderPayslipHtml, renderPayslipHtmlFromTemplate, type PayslipRenderData } from "@/server/payroll/payslip-template";
import { generatePayslipPdf } from "@/server/payroll/pdf-generator";
import { storePrivateFile } from "@/server/storage/s3";
import { payslipGenerateQueue, emailNotifyQueue } from "@/server/queue/queues";
import { PAYROLL_AUDIT_ACTIONS } from "@/server/payroll/audit-actions";
import { buildPayslipAvailableEmail } from "@/server/payroll/payslip-email";
import { partitionIssuableLines } from "@/server/payroll/payment-decision";
import type { EmailDeliveryPreference, EmailDeliveryStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { templateFacade } from "@/server/facades/template-facade";
import { employeeFacade } from "@/server/facades/employee-facade";
import { populatePayrollEmployeeLines } from "@/server/payroll/populate-run";

export class PayrollFacade {
  async createPayrollRun(
    companyIdOrInput: string | {
    actorUserId: string;
    companyId: string;
    year: number;
    month: number;
    /** When false, creates the run shell only (used by statement automation that creates lines itself). */
    populateLines?: boolean;
    /** Forwarded to populate; default true. Statement automation sets false to own payment decisions. */
    matchPayments?: boolean;
    },
    year?: number,
    month?: number,
  ) {
    const input = typeof companyIdOrInput === "string"
      ? { actorUserId: undefined, companyId: companyIdOrInput, year: year!, month: month!, populateLines: true, matchPayments: true }
      : companyIdOrInput;
    if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new Error("Invalid payroll period");
    }
    const existing = await prisma.payrollRun.findUnique({
      where: {
        companyId_year_month: {
          companyId: input.companyId,
          year: input.year,
          month: input.month,
        },
      },
    });

    const run =
      existing ??
      (await prisma.payrollRun.create({
        data: {
          companyId: input.companyId,
          year: input.year,
          month: input.month,
          status: "DRAFT",
          createdById: input.actorUserId,
        },
      }));

    if (!existing) {
      await writeAudit({
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        action: "payroll.create",
        entityType: "PayrollRun",
        entityId: run.id,
      });
    }

    // Creating a payroll run must produce an actionable employee list. Statement matching
    // may enrich lines later; it is not a prerequisite for line creation.
    const shouldPopulate = input.populateLines !== false;
    if (shouldPopulate) {
      const populated = await populatePayrollEmployeeLines({
        actorUserId: input.actorUserId,
        payrollRunId: run.id,
        matchPayments: input.matchPayments !== false,
      });
      return {
        ...run,
        diagnostics: populated.diagnostics,
        matchSummary: populated.matchSummary,
      };
    }

    return run;
  }

  async populateEmployeeLines(input: {
    actorUserId?: string;
    payrollRunId: string;
    matchPayments?: boolean;
  }) {
    return populatePayrollEmployeeLines(input);
  }

  async upsertEmployeeLine(input: {
    actorUserId: string;
    payrollRunId: string;
    employeeId: string;
    earnings: Array<{ code: string; label: string; actual: number; payable: number }>;
    deductions: Array<{ code: string; label: string; amount: number }>;
    working?: Partial<{
      workingDays: number;
      weeklyOffs: number;
      paidHolidays: number;
      presentDays: number;
      casualLeave: number;
      privilegedLeave: number;
      sickLeave: number;
      leaveWithoutPay: number;
    }>;
    cashComponent?: number;
    primaryTxnId?: string;
  }) {
    const run = await prisma.payrollRun.findUniqueOrThrow({ where: { id: input.payrollRunId } });
    if (run.status === "ISSUED") throw new Error("Cannot edit issued payroll");
    await employeeFacade.getById(input.employeeId, run.companyId);

    const { money, moneySum, roundInr } = await import("@/server/finance/money");
    const grossEarnings = roundInr(moneySum(input.earnings.map((e) => e.payable)));
    const grossDeductions = roundInr(moneySum(input.deductions.map((d) => d.amount)));
    const netAmount = roundInr(money(grossEarnings).minus(grossDeductions).plus(input.cashComponent ?? 0));

    const line = await prisma.$transaction(async (tx) => {
      const upserted = await tx.payrollEmployeeLine.upsert({
        where: {
          payrollRunId_employeeId: {
            payrollRunId: input.payrollRunId,
            employeeId: input.employeeId,
          },
        },
        create: {
          payrollRunId: input.payrollRunId,
          employeeId: input.employeeId,
          primaryTxnId: input.primaryTxnId,
          status: "DRAFT",
          workingDays: input.working?.workingDays,
          weeklyOffs: input.working?.weeklyOffs,
          paidHolidays: input.working?.paidHolidays,
          presentDays: input.working?.presentDays,
          casualLeave: input.working?.casualLeave,
          privilegedLeave: input.working?.privilegedLeave,
          sickLeave: input.working?.sickLeave,
          leaveWithoutPay: input.working?.leaveWithoutPay,
          cashComponent: input.cashComponent,
          grossEarnings,
          grossDeductions,
          netAmount,
          amountInWords: amountInWordsInr(netAmount),
        },
        update: {
          primaryTxnId: input.primaryTxnId,
          status: "DRAFT",
          workingDays: input.working?.workingDays,
          weeklyOffs: input.working?.weeklyOffs,
          paidHolidays: input.working?.paidHolidays,
          presentDays: input.working?.presentDays,
          casualLeave: input.working?.casualLeave,
          privilegedLeave: input.working?.privilegedLeave,
          sickLeave: input.working?.sickLeave,
          leaveWithoutPay: input.working?.leaveWithoutPay,
          cashComponent: input.cashComponent,
          grossEarnings,
          grossDeductions,
          netAmount,
          amountInWords: amountInWordsInr(netAmount),
          approvedAt: null,
        },
      });

      await tx.payrollEarningLine.deleteMany({ where: { lineId: upserted.id } });
      await tx.payrollDeductionLine.deleteMany({ where: { lineId: upserted.id } });
      if (input.earnings.length) {
        await tx.payrollEarningLine.createMany({
          data: input.earnings.map((e) => ({
            lineId: upserted.id,
            code: e.code,
            label: e.label,
            actual: e.actual,
            payable: e.payable,
          })),
        });
      }
      if (input.deductions.length) {
        await tx.payrollDeductionLine.createMany({
          data: input.deductions.map((d) => ({
            lineId: upserted.id,
            code: d.code,
            label: d.label,
            amount: d.amount,
          })),
        });
      }
      return upserted;
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: run.companyId,
      action: "payroll.line_upsert",
      entityType: "PayrollEmployeeLine",
      entityId: line.id,
    });
    return line;
  }

  async approveLine(inputOrLineId: { actorUserId: string; lineId: string } | string) {
    const input = typeof inputOrLineId === "string"
      ? { actorUserId: undefined, lineId: inputOrLineId }
      : inputOrLineId;
    const existing = await prisma.payrollEmployeeLine.findUniqueOrThrow({
      where: { id: input.lineId },
    });
    if (existing.paymentStatus === "SALARY_STRUCTURE_INCOMPLETE") {
      throw new Error(
        "Historical salary review required — confirm the salary structure for this month before approval",
      );
    }
    const line = await prisma.payrollEmployeeLine.update({
      where: { id: input.lineId },
      data: { status: "APPROVED", approvedAt: new Date() },
      include: { payrollRun: true },
    });
    await prisma.payrollRun.update({
      where: { id: line.payrollRunId },
      data: { status: "READY_FOR_REVIEW" },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: line.payrollRun.companyId,
      action: "payroll.line_approve",
      entityType: "PayrollEmployeeLine",
      entityId: line.id,
    });
    return line;
  }

  async approveRun(inputOrRunId: { actorUserId: string; payrollRunId: string } | string) {
    const input = typeof inputOrRunId === "string"
      ? { actorUserId: undefined, payrollRunId: inputOrRunId }
      : inputOrRunId;
    const salaryGaps = await prisma.payrollEmployeeLine.count({
      where: {
        payrollRunId: input.payrollRunId,
        paymentStatus: "SALARY_STRUCTURE_INCOMPLETE",
      },
    });
    if (salaryGaps > 0) {
      throw new Error(
        `${salaryGaps} employee line(s) need historical salary review before the run can be approved`,
      );
    }
    const pending = await prisma.payrollEmployeeLine.count({
      where: { payrollRunId: input.payrollRunId, status: { not: "APPROVED" } },
    });
    if (pending > 0) throw new Error("All lines must be approved first");
    const run = await prisma.payrollRun.update({
      where: { id: input.payrollRunId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: run.companyId,
      action: "payroll.run_approve",
      entityType: "PayrollRun",
      entityId: run.id,
    });
    return run;
  }

  async issueSelectedPayslips(
    inputOrRunId: {
      actorUserId: string;
      payrollRunId: string;
      lineIds: string[];
      confirmation: { count: number; month: number; companyId: string };
    } | string,
    selectedLineIds?: string[],
    selectedConfirmation?: { count: number; month: number; companyId: string },
  ) {
    const input = typeof inputOrRunId === "string"
      ? {
          actorUserId: undefined,
          payrollRunId: inputOrRunId,
          lineIds: selectedLineIds ?? [],
          confirmation: selectedConfirmation!,
        }
      : inputOrRunId;
    if (!input.confirmation) throw new Error("Issue confirmation is required");
    if (!input.lineIds.length || new Set(input.lineIds).size !== input.lineIds.length) {
      throw new Error("A non-empty, unique line selection is required");
    }
    const run = await prisma.payrollRun.findUniqueOrThrow({
      where: { id: input.payrollRunId },
      include: { company: true },
    });

    if (run.status !== "APPROVED") {
      throw new Error("Payroll must be approved before issuing");
    }
    if (input.confirmation.count !== input.lineIds.length) {
      throw new Error("Confirmation count mismatch");
    }
    if (input.confirmation.month !== run.month) {
      throw new Error("Confirmation month mismatch");
    }
    if (input.confirmation.companyId !== run.companyId) {
      throw new Error("Confirmation company mismatch");
    }

    const lines = await prisma.payrollEmployeeLine.findMany({
      where: { id: { in: input.lineIds }, payrollRunId: run.id, status: "APPROVED" },
      include: {
        employee: { include: { contact: true, bankAccount: true } },
        earnings: true,
        deductions: true,
      },
    });
    if (lines.length !== input.lineIds.length) {
      throw new Error("Only approved lines can be issued");
    }

    // Unresolved partial payments and amount mismatches can never reach issue, even if
    // the caller explicitly selects them.
    const { blocked } = partitionIssuableLines(
      lines.map((line) => ({ id: line.id, paymentStatus: line.paymentStatus })),
    );
    if (blocked.length) {
      throw new Error(
        `${blocked.length} selected line(s) still require reconciliation review and cannot be issued`,
      );
    }

    const template = await templateFacade.getActiveTemplate(run.companyId);
    if (!template) throw new Error("No active company template");

    const approvedRemaining = await prisma.payrollEmployeeLine.count({
      where: { payrollRunId: run.id, status: "APPROVED" },
    });
    if (approvedRemaining === lines.length) {
      await prisma.payrollRun.update({
        where: { id: run.id },
        data: { status: "ISSUING" },
      });
    }

    const issued = [];
    for (const line of lines) {
      const verificationCode = nanoid(12).toUpperCase();
      const payslip = await prisma.payslip.create({
        data: {
          companyId: run.companyId,
          employeeId: line.employeeId,
          payrollRunId: run.id,
          payrollLineId: line.id,
          status: "ISSUING",
          verificationCode,
          currentVersion: 1,
        },
      });

      await prisma.payslipVersion.create({
        data: {
          payslipId: payslip.id,
          version: 1,
          templateId: template.id,
          createdById: input.actorUserId,
        },
      });

      await payslipGenerateQueue.add("generate", {
        payslipId: payslip.id,
        version: 1,
      });

      await this.queuePayslipEmail({ payslipId: payslip.id, actorUserId: input.actorUserId });

      await prisma.payrollEmployeeLine.update({
        where: { id: line.id },
        data: { status: "ISSUING" },
      });
      issued.push(payslip);
    }

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: run.companyId,
      action: "payroll.issue",
      entityType: "PayrollRun",
      entityId: run.id,
      metadata: { count: issued.length },
    });

    return issued;
  }

  /** Recipients honour the company's `emailDeliveryPreference`. */
  resolvePayslipRecipients(
    contact: { officialEmail?: string | null; personalEmail?: string | null } | null | undefined,
    preference: EmailDeliveryPreference,
  ): string[] {
    const official = contact?.officialEmail?.trim() || null;
    const personal = contact?.personalEmail?.trim() || null;
    if (preference === "BOTH") {
      return [official, personal].filter((email): email is string => !!email);
    }
    const ordered =
      preference === "PERSONAL_PREFERRED" ? [personal, official] : [official, personal];
    const chosen = ordered.find((email) => !!email);
    return chosen ? [chosen] : [];
  }

  /**
   * Queues the availability notification for an issued payslip. The message body never
   * carries salary figures — only a link back to the authenticated portal.
   */
  async queuePayslipEmail(input: {
    payslipId: string;
    actorUserId?: string;
    resend?: boolean;
  }) {
    const slip = await prisma.payslip.findUniqueOrThrow({
      where: { id: input.payslipId },
      include: {
        company: true,
        payrollRun: true,
        employee: { include: { contact: true } },
      },
    });
    const recipients = this.resolvePayslipRecipients(
      slip.employee.contact,
      slip.company.emailDeliveryPreference,
    );
    if (!recipients.length) {
      throw new Error("Employee has no email address for the company delivery preference");
    }

    const message = buildPayslipAvailableEmail({
      companyName: slip.company.name,
      employeeName: `${slip.employee.firstName} ${slip.employee.lastName}`,
      month: slip.payrollRun.month,
      year: slip.payrollRun.year,
      resend: input.resend,
    });

    const deliveries = [];
    for (const to of recipients) {
      const delivery = await prisma.payslipEmailDelivery.create({
        data: {
          payslipId: slip.id,
          toEmail: to,
          status: "QUEUED",
          createdById: input.actorUserId,
        },
      });
      await emailNotifyQueue.add("notify", {
        to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        deliveryId: delivery.id,
      });
      deliveries.push(delivery);
    }

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: slip.companyId,
      action: input.resend
        ? PAYROLL_AUDIT_ACTIONS.payslipEmailResend
        : PAYROLL_AUDIT_ACTIONS.payslipEmailQueued,
      entityType: "Payslip",
      entityId: slip.id,
      metadata: { recipients: recipients.length, preference: slip.company.emailDeliveryPreference },
    });

    return deliveries;
  }

  /**
   * Records the outcome of a queued notification. Delivery state is tracked separately
   * from issue state: a bounced or failed email never un-issues a payslip.
   */
  async markEmailDelivery(input: {
    deliveryId: string;
    status: EmailDeliveryStatus;
    providerMessageId?: string;
    failureReason?: string;
  }) {
    const now = new Date();
    const delivery = await prisma.payslipEmailDelivery.update({
      where: { id: input.deliveryId },
      data: {
        status: input.status,
        providerMessageId: input.providerMessageId,
        failureReason: input.status === "FAILED" || input.status === "BOUNCED"
          ? input.failureReason ?? "Email delivery failed"
          : null,
        sentAt: input.status === "SENT" ? now : undefined,
        deliveredAt: input.status === "DELIVERED" ? now : undefined,
        failedAt: input.status === "FAILED" || input.status === "BOUNCED" ? now : undefined,
      },
      include: { payslip: { include: { payrollLine: true } } },
    });

    const txnId = delivery.payslip.payrollLine.primaryTxnId;
    if (txnId) {
      const succeeded = input.status === "SENT" || input.status === "DELIVERED";
      const failed = input.status === "FAILED" || input.status === "BOUNCED";
      if (succeeded || failed) {
        await prisma.statementTransaction.update({
          where: { id: txnId },
          data: { reconciliationStatus: succeeded ? "EMAIL_SENT" : "EMAIL_FAILED" },
        });
      }
    }

    await writeAudit({
      companyId: delivery.payslip.companyId,
      action:
        input.status === "FAILED" || input.status === "BOUNCED"
          ? PAYROLL_AUDIT_ACTIONS.payslipEmailFailed
          : PAYROLL_AUDIT_ACTIONS.payslipEmailSent,
      entityType: "PayslipEmailDelivery",
      entityId: delivery.id,
      metadata: { status: input.status, toEmail: delivery.toEmail },
    });

    return delivery;
  }

  async resendPayslipEmail(input: { actorUserId: string; payslipId: string }) {
    const slip = await prisma.payslip.findUniqueOrThrow({ where: { id: input.payslipId } });
    if (slip.status !== "ISSUED") {
      throw new Error("Only issued payslips can have their notification resent");
    }
    const previous = await prisma.payslipEmailDelivery.count({ where: { payslipId: slip.id } });
    const deliveries = await this.queuePayslipEmail({
      payslipId: slip.id,
      actorUserId: input.actorUserId,
      resend: true,
    });
    await prisma.payslipEmailDelivery.updateMany({
      where: { id: { in: deliveries.map((delivery) => delivery.id) } },
      data: { resendCount: previous },
    });
    return deliveries;
  }

  async markPayslipIssued(input: {
    payslipId: string;
    version: number;
    pdfFileId: string;
    calcSnapshotFileId: string;
    sha256: string;
  }) {
    await prisma.$transaction([
      prisma.payslipVersion.update({
        where: {
          payslipId_version: { payslipId: input.payslipId, version: input.version },
        },
        data: {
          pdfFileId: input.pdfFileId,
          calcSnapshotFileId: input.calcSnapshotFileId,
          sha256: input.sha256,
        },
      }),
      prisma.payslip.update({
        where: { id: input.payslipId },
        data: { status: "ISSUED", issuedAt: new Date() },
      }),
    ]);

    const slip = await prisma.payslip.findUniqueOrThrow({ where: { id: input.payslipId } });
    await prisma.payrollEmployeeLine.update({
      where: { id: slip.payrollLineId },
      data: { status: "ISSUED" },
    });

    const remaining = await prisma.payrollEmployeeLine.count({
      where: {
        payrollRunId: slip.payrollRunId,
        status: { in: ["APPROVED", "ISSUING", "DRAFT"] },
      },
    });
    if (remaining === 0) {
      await prisma.payrollRun.update({
        where: { id: slip.payrollRunId },
        data: { status: "ISSUED", issuedAt: new Date() },
      });
    }
  }

  async correctPayslip(
    inputOrPayslipId: { actorUserId: string; payslipId: string; reason: string } | string,
    correctionReason?: string,
  ) {
    const input = typeof inputOrPayslipId === "string"
      ? { actorUserId: undefined, payslipId: inputOrPayslipId, reason: correctionReason ?? "" }
      : inputOrPayslipId;
    if (!input.reason.trim()) throw new Error("A correction reason is required");
    const slip = await prisma.payslip.findUniqueOrThrow({
      where: { id: input.payslipId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (slip.status !== "ISSUED") throw new Error("Only issued payslips can be corrected");
    const nextVersion = slip.currentVersion + 1;
    const templateId = slip.versions[0]?.templateId;
    if (!templateId) throw new Error("Missing template on prior version");

    await prisma.payslip.update({
      where: { id: slip.id },
      data: { status: "ISSUING", currentVersion: nextVersion },
    });
    await prisma.payslipVersion.create({
      data: {
        payslipId: slip.id,
        version: nextVersion,
        templateId,
        correctionReason: input.reason.trim(),
        createdById: input.actorUserId,
      },
    });
    await payslipGenerateQueue.add("generate", {
      payslipId: slip.id,
      version: nextVersion,
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: slip.companyId,
      action: "payroll.correct",
      entityType: "Payslip",
      entityId: slip.id,
      metadata: { reason: input.reason, version: nextVersion },
    });
    return { payslipId: slip.id, version: nextVersion };
  }

  async getPayslipForEmployee(payslipId: string, employeeId: string) {
    return prisma.payslip.findFirstOrThrow({
      where: { id: payslipId, employeeId },
      include: {
        payrollRun: { select: { month: true, year: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          include: { pdfFile: true },
        },
      },
    });
  }

  async verifyDocument(code: string) {
    const slip = await prisma.payslip.findUnique({
      where: { verificationCode: code },
      include: {
        company: true,
        payrollRun: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!slip || slip.status !== "ISSUED") {
      return {
        valid: false as const,
        companyName: null,
        period: null,
        issueDate: null,
        hashPrefix: null,
      };
    }
    const sha = slip.versions[0]?.sha256 ?? "";
    return {
      valid: true as const,
      companyName: slip.company.name,
      period: `${String(slip.payrollRun.month).padStart(2, "0")}/${slip.payrollRun.year}`,
      issueDate: slip.issuedAt?.toISOString() ?? null,
      hashPrefix: sha.slice(0, 12),
    };
  }

  async buildRenderData(payslipId: string): Promise<PayslipRenderData> {
    const slip = await prisma.payslip.findUniqueOrThrow({
      where: { id: payslipId },
      include: {
        company: true,
        payrollRun: true,
        employee: { include: { bankAccount: true } },
        payrollLine: { include: { earnings: true, deductions: true } },
      },
    });
    const line = slip.payrollLine;
    return {
      companyName: slip.company.name,
      companyGstin: slip.company.gstin,
      companyAddress: slip.company.address,
      month: slip.payrollRun.month,
      year: slip.payrollRun.year,
      employeeCode: slip.employee.employeeCode,
      employeeName: `${slip.employee.firstName} ${slip.employee.lastName}`,
      designation: slip.employee.designation,
      department: slip.employee.department,
      location: slip.employee.location,
      doj: slip.employee.dateOfJoining?.toISOString().slice(0, 10) ?? null,
      pfNumber: slip.employee.pfNumber,
      uan: slip.employee.uan,
      esiNumber: slip.employee.esiNumber,
      bankName: slip.employee.bankAccount?.bankName,
      accountNumber: slip.employee.bankAccount?.accountNumber,
      working: {
        wd: line.workingDays ? Number(line.workingDays) : null,
        wo: line.weeklyOffs ? Number(line.weeklyOffs) : null,
        ph: line.paidHolidays ? Number(line.paidHolidays) : null,
        pd: line.presentDays ? Number(line.presentDays) : null,
        cl: line.casualLeave ? Number(line.casualLeave) : null,
        pl: line.privilegedLeave ? Number(line.privilegedLeave) : null,
        sl: line.sickLeave ? Number(line.sickLeave) : null,
        lwp: line.leaveWithoutPay ? Number(line.leaveWithoutPay) : null,
      },
      earnings: line.earnings.map((e) => ({
        code: e.code,
        label: e.label,
        actual: Number(e.actual),
        payable: Number(e.payable),
      })),
      deductions: line.deductions.map((d) => ({
        code: d.code,
        label: d.label,
        amount: Number(d.amount),
      })),
      grossEarnings: Number(line.grossEarnings),
      grossDeductions: Number(line.grossDeductions),
      netAmount: Number(line.netAmount),
      amountInWords: line.amountInWords ?? amountInWordsInr(Number(line.netAmount)),
    };
  }

  async buildPreviewRenderData(input: {
    employeeId: string;
    companyId: string;
    year: number;
    month: number;
    earnings: Array<{ code: string; label: string; actual: number; payable: number }>;
    deductions: Array<{ code: string; label: string; amount: number }>;
    working?: Partial<{
      workingDays: number;
      weeklyOffs: number;
      paidHolidays: number;
      presentDays: number;
      casualLeave: number;
      privilegedLeave: number;
      sickLeave: number;
      leaveWithoutPay: number;
    }>;
    cashComponent?: number;
  }): Promise<PayslipRenderData> {
    const employee = await employeeFacade.getById(input.employeeId, input.companyId);
    const { money, moneySum, roundInr } = await import("@/server/finance/money");
    const grossEarnings = roundInr(moneySum(input.earnings.map((e) => e.payable)));
    const grossDeductions = roundInr(moneySum(input.deductions.map((d) => d.amount)));
    const netAmount = roundInr(money(grossEarnings).minus(grossDeductions).plus(input.cashComponent ?? 0));
    return {
      companyName: employee.company.name,
      companyGstin: employee.company.gstin,
      companyAddress: employee.company.address,
      month: input.month,
      year: input.year,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      designation: employee.designation,
      department: employee.department,
      location: employee.location,
      doj: employee.dateOfJoining?.toISOString().slice(0, 10) ?? null,
      pfNumber: employee.pfNumber,
      uan: employee.uan,
      esiNumber: employee.esiNumber,
      bankName: employee.bankAccount?.bankName,
      accountNumber: employee.bankAccount?.accountNumber,
      working: {
        wd: input.working?.workingDays ?? null,
        wo: input.working?.weeklyOffs ?? null,
        ph: input.working?.paidHolidays ?? null,
        pd: input.working?.presentDays ?? null,
        cl: input.working?.casualLeave ?? null,
        pl: input.working?.privilegedLeave ?? null,
        sl: input.working?.sickLeave ?? null,
        lwp: input.working?.leaveWithoutPay ?? null,
      },
      earnings: input.earnings,
      deductions: input.deductions,
      grossEarnings,
      grossDeductions,
      netAmount,
      amountInWords: amountInWordsInr(netAmount),
    };
  }

  async previewPayslipHtml(input: {
    employeeId: string;
    companyId: string;
    year: number;
    month: number;
    earnings: Array<{ code: string; label: string; actual: number; payable: number }>;
    deductions: Array<{ code: string; label: string; amount: number }>;
    working?: Partial<{
      workingDays: number;
      weeklyOffs: number;
      paidHolidays: number;
      presentDays: number;
      casualLeave: number;
      privilegedLeave: number;
      sickLeave: number;
      leaveWithoutPay: number;
    }>;
    cashComponent?: number;
  }) {
    const data = await this.buildPreviewRenderData(input);
    const template = await templateFacade.getActiveTemplate(input.companyId);
    const html =
      template?.htmlBody?.trim()
        ? renderPayslipHtmlFromTemplate(template.htmlBody, template.cssBody, data)
        : renderPayslipHtml(data);
    return { html, data };
  }

  async generateAndStorePayslip(payslipId: string, version: number) {
    const data = await this.buildRenderData(payslipId);
    const slip = await prisma.payslip.findUniqueOrThrow({
      where: { id: payslipId },
      include: {
        company: true,
        employee: true,
        payrollRun: true,
        versions: { where: { version }, take: 1 },
      },
    });
    const folder = (
      await import("@/server/documents/naming")
    ).payslipFolderPrefix({
      companyPrefix: slip.company.prefix,
      employeeCode: slip.employee.employeeCode,
      firstName: slip.employee.firstName,
      lastName: slip.employee.lastName,
      year: slip.payrollRun.year,
      month: slip.payrollRun.month,
    });
    const { payslipPdfFileName, payslipCalcFileName } = await import(
      "@/server/documents/naming"
    );
    const pdfName = payslipPdfFileName({
      employeeCode: slip.employee.employeeCode,
      year: slip.payrollRun.year,
      month: slip.payrollRun.month,
      version,
    });
    const calcName = payslipCalcFileName({
      employeeCode: slip.employee.employeeCode,
      year: slip.payrollRun.year,
      month: slip.payrollRun.month,
      version,
    });

    const versionTemplateId = slip.versions[0]?.templateId;
    const template = versionTemplateId
      ? await prisma.companyTemplate.findUnique({ where: { id: versionTemplateId } })
      : await templateFacade.getActiveTemplate(slip.companyId);
    const html =
      template?.htmlBody?.trim()
        ? renderPayslipHtmlFromTemplate(template.htmlBody, template.cssBody, data)
        : renderPayslipHtml(data);
    const { buffer, sha256 } = await generatePayslipPdf(html);
    const pdfFile = await storePrivateFile({
      buffer,
      mimeType: "application/pdf",
      originalName: pdfName,
      prefix: folder,
    });
    const calcFile = await storePrivateFile({
      buffer: Buffer.from(JSON.stringify(data), "utf8"),
      mimeType: "application/json",
      originalName: calcName,
      prefix: folder,
    });
    await this.markPayslipIssued({
      payslipId,
      version,
      pdfFileId: pdfFile.id,
      calcSnapshotFileId: calcFile.id,
      sha256,
    });
    return { sha256, pdfFileId: pdfFile.id, storagePath: `${folder}/${pdfName}` };
  }
}

export const payrollFacade = new PayrollFacade();

// silence unused Decimal import if tree-shaken oddly
void Decimal;
