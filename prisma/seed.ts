import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/crypto";
import {
  createDefaultTemplateBody,
  DEFAULT_TEMPLATE_CSS,
} from "../src/server/payroll/payslip-template";
import { seedDefaultProfitPolicies } from "../src/server/finance/profit-engine";

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEV !== "1") {
    console.log("Skipping seed: set SEED_DEV=1 to run development seed.");
    return;
  }

  const adminPassword = await hashPassword("Swrit#1311");
  const admin = await prisma.user.upsert({
    where: { phone: "+919999131101" },
    update: {
      email: "thenovaworkforce@gmail.com",
      displayName: "Love Chauhan",
      passwordHash: adminPassword,
      globalRole: "SUPER_ADMIN",
      mustChangePassword: false,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      phone: "+919999131101",
      email: "thenovaworkforce@gmail.com",
      displayName: "Love Chauhan",
      passwordHash: adminPassword,
      globalRole: "SUPER_ADMIN",
      mustChangePassword: false,
    },
  });

  const nw = await prisma.company.upsert({
    where: { prefix: "NW" },
    update: {
      name: "Nova Workforce",
      gstin: "Needs configuration",
      address: "Needs configuration",
    },
    create: {
      name: "Nova Workforce",
      prefix: "NW",
      gstin: "Needs configuration",
      address: "Needs configuration",
      sequence: { create: { nextNumber: 21 } },
    },
  });

  const nq = await prisma.company.upsert({
    where: { prefix: "NQ" },
    update: {},
    create: {
      name: "Nova Qore",
      prefix: "NQ",
      gstin: "Needs configuration",
      address: "Needs configuration",
      sequence: { create: { nextNumber: 1 } },
    },
  });

  for (const company of [nw, nq]) {
    const existing = await prisma.companyTemplate.findFirst({
      where: { companyId: company.id, version: 1 },
    });
    if (!existing) {
      await prisma.companyTemplate.create({
        data: {
          companyId: company.id,
          name: "Form IV B — Default",
          version: 1,
          htmlBody: createDefaultTemplateBody(),
          cssBody: DEFAULT_TEMPLATE_CSS,
          isActive: true,
        },
      });
    }
    await seedDefaultProfitPolicies(company.id, company.prefix);
  }

  const demoCode = "NW-0020";
  const demoPhone = "+919888000020";
  let demoEmployee = await prisma.employee.findFirst({
    where: { companyId: nw.id, employeeCode: demoCode },
    include: { user: true, contact: true },
  });

  if (!demoEmployee) {
    demoEmployee = await prisma.employee.create({
      data: {
        companyId: nw.id,
        employeeCode: demoCode,
        firstName: "Demo",
        lastName: "Employee",
        designation: "Operations Associate",
        department: "Ops",
        location: "India",
        dateOfJoining: new Date("2025-04-01"),
        status: "ACTIVE",
        contact: {
          create: {
            personalEmail: "demo.employee@nova.local",
            officialEmail: "demo.employee@novaworkforce.local",
            primaryPhone: demoPhone,
          },
        },
        bankAccount: {
          create: {
            bankName: "Axis Bank",
            accountNumber: "XXXXXXXX4521",
            accountLast4: "4521",
            ifsc: "UTIB0000000",
          },
        },
        salaryStructure: {
          create: {
            componentsJson: {
              BASIC: 17500,
              HRA: 8750,
              CONV: 1200,
              MED: 1000,
              SPEC: 2600,
              TRAV: 1200,
              OTHER: 2750,
              net: 33671,
            },
          },
        },
      },
      include: { user: true, contact: true },
    });
  }

  const demoPassword = await hashPassword("DemoEmp#1311");
  if (demoEmployee.user) {
    await prisma.user.update({
      where: { id: demoEmployee.user.id },
      data: {
        phone: demoPhone,
        email: "demo.employee@novaworkforce.local",
        displayName: "Demo Employee",
        passwordHash: demoPassword,
        globalRole: "EMPLOYEE",
        mustChangePassword: false,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        phone: demoPhone,
        email: "demo.employee@novaworkforce.local",
        displayName: "Demo Employee",
        passwordHash: demoPassword,
        globalRole: "EMPLOYEE",
        mustChangePassword: false,
        employeeId: demoEmployee.id,
      },
    });
  }

  console.log("Seeded admin:", admin.displayName, admin.email);
  console.log("Seeded demo employee:", demoCode, demoPhone, "password DemoEmp#1311");
  console.log("Companies:", nw.prefix, nq.prefix);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
