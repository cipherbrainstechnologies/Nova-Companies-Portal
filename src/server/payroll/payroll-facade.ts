import { nanoid } from "nanoid";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { amountInWordsInr } from "@/server/payroll/amount-in-words";
import { renderPayslipHtml, type PayslipRenderData } from "@/server/payroll/payslip-template";
import { generatePayslipPdf } from "@/server/payroll/pdf-generator";
import { storePrivateFile } from "@/server/storage/s3";
import { payslipGenerateQueue, emailNotifyQueue } from "@/server/queue/queues";
import { Decimal } from "@prisma/client/runtime/library";

export class PayrollFacade {
  async createPayrollRun(
    companyIdOrInput: string | {
    actorUserId: string;
    companyId: string;
    year: number;
    month: number;
    },
    year?: number,
    month?: number,
  ) {
    const input = typeof companyIdOrInput === "string"
      ? { actorUserId: undefined, companyId: companyIdOrInput, year: year!, month: month! }
      : companyIdOrInput;
    if (!Number.isInteger(input.year) || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new Error("Invalid payroll period");
    }
    const run = await prisma.payrollRun.create({
      data: {
        companyId: input.companyId,
        year: input.year,
        month: input.month,
        status: "DRAFT",
        createdById: input.actorUserId,
      },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      action: "payroll.create",
      entityType: "PayrollRun",
      entityId: run.id,
    });
    return run;
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

    const grossEarnings = input.earnings.reduce((s, e) => s + e.payable, 0);
    const grossDeductions = input.deductions.reduce((s, d) => s + d.amount, 0);
    const netAmount = grossEarnings - grossDeductions + (input.cashComponent ?? 0);

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

    const template = await prisma.companyTemplate.findFirst({
      where: { companyId: run.companyId, isActive: true },
      orderBy: { version: "desc" },
    });
    if (!template) throw new Error("No active company template");

    await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "ISSUING" },
    });

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

      const email = line.employee.contact?.officialEmail ?? line.employee.contact?.personalEmail;
      if (email) {
        await emailNotifyQueue.add("notify", {
          to: email,
          subject: "Your payslip is available",
          text: `A payslip for ${run.month}/${run.year} is available in the Nova Salary Portal. Sign in to download. This email does not include salary amounts.`,
        });
      }

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

  async generateAndStorePayslip(payslipId: string, version: number) {
    const data = await this.buildRenderData(payslipId);
    const html = renderPayslipHtml(data);
    const { buffer, sha256 } = await generatePayslipPdf(html);
    const pdfFile = await storePrivateFile({
      buffer,
      mimeType: "application/pdf",
      originalName: `payslip-${payslipId}-v${version}.pdf`,
      prefix: "payslips",
    });
    const calcFile = await storePrivateFile({
      buffer: Buffer.from(JSON.stringify(data), "utf8"),
      mimeType: "application/json",
      originalName: `payslip-${payslipId}-v${version}.json`,
      prefix: "calc-snapshots",
    });
    await this.markPayslipIssued({
      payslipId,
      version,
      pdfFileId: pdfFile.id,
      calcSnapshotFileId: calcFile.id,
      sha256,
    });
    return { sha256, pdfFileId: pdfFile.id };
  }
}

export const payrollFacade = new PayrollFacade();

// silence unused Decimal import if tree-shaken oddly
void Decimal;
