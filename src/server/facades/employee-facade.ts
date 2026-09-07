import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { companyFacade } from "@/server/facades/company-facade";
import { normalizeIndianPhone } from "@/server/auth/phone";
import { hashPassword } from "@/server/auth/crypto";
import { revokeAllUserSessions } from "@/server/auth/session";
import type { EmployeeStatus } from "@prisma/client";

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
  temporaryPassword: string;
  salaryComponents?: Record<string, number>;
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
            },
          },
          salaryStructure: input.salaryComponents
            ? {
                create: {
                  componentsJson: input.salaryComponents,
                },
              }
            : undefined,
        },
      });

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
      metadata: { employeeCode },
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

  async upsertSalaryStructure(input: {
    actorUserId: string;
    employeeId: string;
    components: Record<string, number>;
    notes?: string;
  }) {
    const emp = await prisma.employee.findUniqueOrThrow({ where: { id: input.employeeId } });
    const structure = await prisma.employeeSalaryStructure.upsert({
      where: { employeeId: input.employeeId },
      create: {
        employeeId: input.employeeId,
        componentsJson: input.components,
        notes: input.notes,
      },
      update: {
        componentsJson: input.components,
        notes: input.notes,
        effectiveFrom: new Date(),
      },
    });
    await writeAudit({
      actorUserId: input.actorUserId,
      companyId: emp.companyId,
      action: "employee.salary_structure_upsert",
      entityType: "Employee",
      entityId: emp.id,
    });
    return structure;
  }
}

export const employeeFacade = new EmployeeFacade();
