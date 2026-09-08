import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { companyFacade } from "@/server/facades/company-facade";
import { normalizeIndianPhone } from "@/server/auth/phone";
import { hashPassword } from "@/server/auth/crypto";
import { revokeAllUserSessions } from "@/server/auth/session";
import { PAYROLL_AUDIT_ACTIONS } from "@/server/payroll/audit-actions";
import {
  deriveExpectedMonthlyNet,
  monthlyGrossFromAnnualCtc,
  normalizePaymentAliases,
} from "@/server/payroll/salary-structure";
import type { EmployeeStatus } from "@prisma/client";

export type UpsertSalaryStructureInput = {
  actorUserId: string;
  employeeId: string;
  components?: Record<string, number>;
  annualCtc?: number | null;
  monthlyGross?: number | null;
  monthlyTds?: number | null;
  monthlyPt?: number | null;
  /** Optional override; otherwise derived as gross − TDS − PT. */
  expectedMonthlyNet?: number | null;
  effectiveFrom?: Date;
  /** Replaces the alias list when provided. Narration aliases feed bank matching. */
  paymentAliases?: string[];
  accountHolderName?: string | null;
  notes?: string;
};

export type CreateEmployeeInput = {
  actorUserId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  department?: string;
  location?: string;
  dateOfJoining?: Date;
  personalEmail?: string;
  officialEmail?: string;
  primaryPhone: string;
  alternatePhone?: string;
  pan?: string;
  pfNumber?: string;
  uan?: string;
  esiNumber?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  /** Name the bank prints on the payment narration; feeds statement matching. */
  accountHolderName?: string | null;
  /** Extra narration spellings for this employee; feeds statement matching. */
  paymentAliases?: string[];
  temporaryPassword: string;
  salaryComponents?: Record<string, number>;
  annualCtc?: number | null;
  monthlyGross?: number | null;
  monthlyTds?: number | null;
  monthlyPt?: number | null;
  /** Optional override; otherwise derived as gross − TDS − PT. */
  expectedMonthlyNet?: number | null;
  effectiveFrom?: Date;
};

export type CreateEmployeeFromImportInput = {
  actorUserId: string;
  companyId: string;
  employeeId?: string;
  displayName: string;
  firstName: string;
  lastName: string;
  designation?: string;
  dateOfJoining?: Date;
  annualCtc: number;
  monthlyGross: number;
  monthlyTds: number;
  monthlyPt: number;
  expectedMonthlyNet: number;
  effectiveFrom?: Date;
};

export class EmployeeFacade {
  async listByCompany(companyId: string) {
    return prisma.employee.findMany({
      where: { companyId },
      include: { contact: true, bankAccount: true, salaryStructure: true },
      orderBy: { employeeCode: "asc" },
    });
  }

  async getById(employeeId: string, companyId?: string) {
    const emp = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: { contact: true, bankAccount: true, salaryStructure: true, company: true },
    });
    if (companyId && emp.companyId !== companyId) {
      throw new Error("Company scope mismatch");
    }
    return emp;
  }

  async create(input: CreateEmployeeInput) {
    if (!input.personalEmail && !input.officialEmail) {
      throw new Error("At least one email is required");
    }
    const phone = normalizeIndianPhone(input.primaryPhone);
    const employeeCode = await companyFacade.allocateEmployeeCode(input.companyId);
    const accountLast4 = input.accountNumber
      ? input.accountNumber.replace(/\D/g, "").slice(-4)
      : undefined;

    const expectedMonthlyNet = deriveExpectedMonthlyNet({
      annualCtc: input.annualCtc,
      monthlyGross: input.monthlyGross,
      monthlyTds: input.monthlyTds,
      monthlyPt: input.monthlyPt,
      expectedMonthlyNet: input.expectedMonthlyNet,
    });
    const monthlyGross =
      input.monthlyGross ?? monthlyGrossFromAnnualCtc(input.annualCtc) ?? undefined;
    const effectiveFrom = input.effectiveFrom ?? new Date();
    const aliases = normalizePaymentAliases([
      ...(input.paymentAliases ?? []),
      // The account-holder name is itself a narration spelling worth matching on.
      input.accountHolderName ?? null,
    ]);
    // Only create a structure when there is something to record, so an employee added
    // without pay details stays explicitly "structure incomplete" rather than zeroed.
    const hasStructure =
      input.salaryComponents != null ||
      input.annualCtc != null ||
      input.monthlyGross != null ||
      input.expectedMonthlyNet != null;

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          companyId: input.companyId,
          employeeCode,
          firstName: input.firstName,
          lastName: input.lastName,
          designation: input.designation,
          department: input.department,
          location: input.location,
          dateOfJoining: input.dateOfJoining,
          pan: input.pan,
          pfNumber: input.pfNumber,
          uan: input.uan,
          esiNumber: input.esiNumber,
          contact: {
            create: {
              personalEmail: input.personalEmail,
              officialEmail: input.officialEmail,
              primaryPhone: phone,
              alternatePhone: input.alternatePhone
                ? normalizeIndianPhone(input.alternatePhone)
                : undefined,
            },
          },
          bankAccount: {
            create: {
              bankName: input.bankName,
              accountNumber: input.accountNumber,
              ifsc: input.ifsc,
              accountLast4,
              accountHolderName: input.accountHolderName?.trim() || null,
            },
          },
          salaryStructure: hasStructure
            ? {
                create: {
                  version: 1,
                  annualCtc: input.annualCtc,
                  monthlyGross,
                  monthlyTds: input.monthlyTds,
                  monthlyPt: input.monthlyPt,
                  expectedMonthlyNet,
                  effectiveFrom,
                  componentsJson: input.salaryComponents ?? {},
                },
              }
            : undefined,
        },
      });

      if (hasStructure) {
        // Version history starts at creation so every payslip stays explainable.
        await tx.employeeSalaryStructureVersion.create({
          data: {
            employeeId: emp.id,
            version: 1,
            annualCtc: input.annualCtc,
            monthlyGross,
            monthlyTds: input.monthlyTds,
            monthlyPt: input.monthlyPt,
            expectedMonthlyNet,
            effectiveFrom,
            componentsJson: input.salaryComponents ?? {},
            createdById: input.actorUserId,
          },
        });
      }

      if (aliases.length) {
        await tx.employeePaymentAlias.createMany({
          data: aliases.map((alias) => ({ employeeId: emp.id, ...alias })),
        });
      }

      await tx.user.create({
        data: {
          phone,
          email: input.officialEmail ?? input.personalEmail,
          passwordHash: await hashPassword(input.temporaryPassword),
          globalRole: "EMPLOYEE",
          mustChangePassword: true,
          employeeId: emp.id,
        },
      });

      return emp;
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      action: "employee.create",
      entityType: "Employee",
      entityId: employee.id,
      metadata: {
        employeeCode,
        salaryStructureCreated: hasStructure,
        expectedMonthlyNet,
        aliasCount: aliases.length,
      },
    });

    return this.getById(employee.id);
  }

  async createFromImport(input: CreateEmployeeFromImportInput) {
    const effectiveFrom = input.effectiveFrom ?? input.dateOfJoining ?? new Date();

    if (input.employeeId) {
      const existing = await this.getById(input.employeeId, input.companyId);
      await prisma.employee.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName,
          firstName: input.firstName,
          lastName: input.lastName,
          designation: input.designation,
          dateOfJoining: input.dateOfJoining,
        },
      });
      await this.upsertSalaryStructure({
        actorUserId: input.actorUserId,
        employeeId: existing.id,
        annualCtc: input.annualCtc,
        monthlyGross: input.monthlyGross,
        monthlyTds: input.monthlyTds,
        monthlyPt: input.monthlyPt,
        expectedMonthlyNet: input.expectedMonthlyNet,
        effectiveFrom,
        notes: "Employee CSV import",
      });
      return this.getById(existing.id);
    }

    const employeeCode = await companyFacade.allocateEmployeeCode(input.companyId);
    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          companyId: input.companyId,
          employeeCode,
          displayName: input.displayName,
          firstName: input.firstName,
          lastName: input.lastName,
          designation: input.designation,
          dateOfJoining: input.dateOfJoining,
          status: "CONTACT_DETAILS_REQUIRED",
          contact: {
            create: {
              primaryPhone: null,
              personalEmail: null,
              officialEmail: null,
            },
          },
          salaryStructure: {
            create: {
              version: 1,
              annualCtc: input.annualCtc,
              monthlyGross: input.monthlyGross,
              monthlyTds: input.monthlyTds,
              monthlyPt: input.monthlyPt,
              expectedMonthlyNet: input.expectedMonthlyNet,
              effectiveFrom,
              componentsJson: {},
              notes: "Employee CSV import",
            },
          },
        },
      });
      await tx.employeeSalaryStructureVersion.create({
        data: {
          employeeId: created.id,
          version: 1,
          annualCtc: input.annualCtc,
          monthlyGross: input.monthlyGross,
          monthlyTds: input.monthlyTds,
          monthlyPt: input.monthlyPt,
          expectedMonthlyNet: input.expectedMonthlyNet,
          effectiveFrom,
          componentsJson: {},
          notes: "Employee CSV import",
          createdById: input.actorUserId,
        },
      });
      return created;
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: input.companyId,
      action: "employee.import_create",
      entityType: "Employee",
      entityId: employee.id,
      metadata: { employeeCode, displayName: input.displayName },
    });
    return this.getById(employee.id);
  }

  async updateStatus(input: {
    actorUserId: string;
    employeeId: string;
    status: EmployeeStatus;
  }) {
    const emp = await prisma.employee.update({
      where: { id: input.employeeId },
      data: { status: input.status },
      include: { user: true },
    });

    if (input.status === "BLOCKED" || input.status === "EXITED") {
      if (emp.user) {
        await prisma.user.update({
          where: { id: emp.user.id },
          data: { isActive: false },
        });
        await revokeAllUserSessions(emp.user.id);
      }
    } else if (input.status === "ACTIVE" && emp.user) {
      await prisma.user.update({
        where: { id: emp.user.id },
        data: { isActive: true },
      });
    }

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: emp.companyId,
      action: "employee.status_change",
      entityType: "Employee",
      entityId: emp.id,
      metadata: { status: input.status },
    });

    return emp;
  }

  async upsertSalaryStructure(input: UpsertSalaryStructureInput) {
    const emp = await prisma.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
    const current = await prisma.employeeSalaryStructure.findUnique({
      where: { employeeId: input.employeeId },
    });

    const expectedMonthlyNet = deriveExpectedMonthlyNet({
      annualCtc: input.annualCtc,
      monthlyGross: input.monthlyGross,
      monthlyTds: input.monthlyTds,
      monthlyPt: input.monthlyPt,
      expectedMonthlyNet: input.expectedMonthlyNet,
    });
    const monthlyGross =
      input.monthlyGross ?? monthlyGrossFromAnnualCtc(input.annualCtc) ?? undefined;
    const effectiveFrom = input.effectiveFrom ?? new Date();
    const version = (current?.version ?? 0) + 1;
    const aliases = normalizePaymentAliases(input.paymentAliases ?? []);

    const structure = await prisma.$transaction(async (tx) => {
      // Snapshot the outgoing revision so historical payslips stay explainable.
      if (current) {
        await tx.employeeSalaryStructureVersion.upsert({
          where: {
            employeeId_version: { employeeId: input.employeeId, version: current.version },
          },
          create: {
            employeeId: input.employeeId,
            version: current.version,
            annualCtc: current.annualCtc,
            monthlyGross: current.monthlyGross,
            monthlyTds: current.monthlyTds,
            monthlyPt: current.monthlyPt,
            expectedMonthlyNet: current.expectedMonthlyNet,
            effectiveFrom: current.effectiveFrom,
            effectiveTo: effectiveFrom,
            componentsJson: current.componentsJson ?? {},
            notes: current.notes,
            createdById: input.actorUserId,
          },
          update: { effectiveTo: effectiveFrom },
        });
      }

      const saved = await tx.employeeSalaryStructure.upsert({
        where: { employeeId: input.employeeId },
        create: {
          employeeId: input.employeeId,
          version,
          annualCtc: input.annualCtc,
          monthlyGross,
          monthlyTds: input.monthlyTds,
          monthlyPt: input.monthlyPt,
          expectedMonthlyNet,
          effectiveFrom,
          componentsJson: input.components ?? {},
          notes: input.notes,
        },
        update: {
          version,
          annualCtc: input.annualCtc,
          monthlyGross,
          monthlyTds: input.monthlyTds,
          monthlyPt: input.monthlyPt,
          expectedMonthlyNet,
          effectiveFrom,
          componentsJson: input.components ?? current?.componentsJson ?? {},
          notes: input.notes,
        },
      });

      await tx.employeeSalaryStructureVersion.upsert({
        where: { employeeId_version: { employeeId: input.employeeId, version } },
        create: {
          employeeId: input.employeeId,
          version,
          annualCtc: saved.annualCtc,
          monthlyGross: saved.monthlyGross,
          monthlyTds: saved.monthlyTds,
          monthlyPt: saved.monthlyPt,
          expectedMonthlyNet: saved.expectedMonthlyNet,
          effectiveFrom: saved.effectiveFrom,
          componentsJson: saved.componentsJson ?? {},
          notes: saved.notes,
          createdById: input.actorUserId,
        },
        update: {
          annualCtc: saved.annualCtc,
          monthlyGross: saved.monthlyGross,
          monthlyTds: saved.monthlyTds,
          monthlyPt: saved.monthlyPt,
          expectedMonthlyNet: saved.expectedMonthlyNet,
          effectiveFrom: saved.effectiveFrom,
          componentsJson: saved.componentsJson ?? {},
          notes: saved.notes,
        },
      });

      if (input.paymentAliases) {
        await tx.employeePaymentAlias.deleteMany({ where: { employeeId: input.employeeId } });
        if (aliases.length) {
          await tx.employeePaymentAlias.createMany({
            data: aliases.map((alias) => ({ employeeId: input.employeeId, ...alias })),
          });
        }
      }

      if (input.accountHolderName !== undefined) {
        await tx.employeeBankAccount.upsert({
          where: { employeeId: input.employeeId },
          create: {
            employeeId: input.employeeId,
            accountHolderName: input.accountHolderName?.trim() || null,
          },
          update: { accountHolderName: input.accountHolderName?.trim() || null },
        });
      }

      return saved;
    });

    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: emp.companyId,
      action: PAYROLL_AUDIT_ACTIONS.salaryStructureUpsert,
      entityType: "Employee",
      entityId: emp.id,
      metadata: {
        version,
        expectedMonthlyNet,
        aliasCount: aliases.length,
        effectiveFrom: effectiveFrom.toISOString(),
      },
    });
    return structure;
  }

  async listSalaryStructureVersions(employeeId: string) {
    return prisma.employeeSalaryStructureVersion.findMany({
      where: { employeeId },
      orderBy: { version: "desc" },
    });
  }
}

export const employeeFacade = new EmployeeFacade();
