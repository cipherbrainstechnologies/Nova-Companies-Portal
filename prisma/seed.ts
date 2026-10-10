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
    } else if (existing.name.startsWith("Form IV B")) {
      // Keep seeded Form IV-B defaults aligned with the Parth Virani reference layout.
      await prisma.companyTemplate.update({
        where: { id: existing.id },
        data: {
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

  const clientSlug = "acme-uk-ltd-demo";
  const client = await prisma.clientOrganization.upsert({
    where: { slug: clientSlug },
    update: { lifecycleStatus: "ACTIVE", proposedNovaCompanyId: nw.id },
    create: {
      slug: clientSlug,
      legalName: "Acme UK Ltd (Demo)",
      tradeName: "Acme UK",
      countryCode: "GB",
      registrationNumber: "DEMO-12345678",
      billingCurrency: "GBP",
      lifecycleStatus: "ACTIVE",
      proposedNovaCompanyId: nw.id,
      onboardingCases: {
        create: {
          status: "ACTIVE",
          checklistJson: { steps: [] },
        },
      },
    },
  });

  const onboardingCase = await prisma.clientOnboardingCase.findFirst({
    where: { clientOrganizationId: client.id },
  });
  if (onboardingCase) {
    const existingReview = await prisma.clientComplianceReview.findFirst({
      where: { onboardingCaseId: onboardingCase.id, outcome: "APPROVED" },
    });
    if (!existingReview) {
      await prisma.clientComplianceReview.create({
        data: {
          onboardingCaseId: onboardingCase.id,
          outcome: "APPROVED",
          riskRating: "LOW",
          reviewerUserId: admin.id,
        },
      });
    }
  }

  await prisma.clientPricingAgreement.upsert({
    where: { clientOrganizationId_version: { clientOrganizationId: client.id, version: 1 } },
    update: {},
    create: {
      clientOrganizationId: client.id,
      version: 1,
      currency: "GBP",
      feePerEmployee: "15000.00",
      effectiveFrom: new Date(),
      approvedByUserId: admin.id,
    },
  });

  let agreement = await prisma.novaEntityClientAgreement.findFirst({
    where: { clientOrganizationId: client.id },
  });
  if (!agreement) {
    agreement = await prisma.novaEntityClientAgreement.create({
      data: {
        clientOrganizationId: client.id,
        novaCompanyId: nw.id,
        contractVersion: "2026.10-demo",
        effectiveFrom: new Date(),
        approvedByUserId: admin.id,
        signatureEnvelopes: {
          create: {
            status: "COMPLETED",
            documentSha256: "demo",
            completedAt: new Date(),
          },
        },
      },
    });
  }

  const clientPassword = await hashPassword("ClientDemo#1311");
  const clientUser = await prisma.user.upsert({
    where: { email: "finance@acme-demo.example" },
    update: {
      passwordHash: clientPassword,
      globalRole: "CLIENT_USER",
      mustChangePassword: false,
      isActive: true,
      phone: "+447700900001",
    },
    create: {
      phone: "+447700900001",
      email: "finance@acme-demo.example",
      displayName: "Acme Finance Demo",
      passwordHash: clientPassword,
      globalRole: "CLIENT_USER",
      mustChangePassword: false,
    },
  });

  await prisma.clientMembership.upsert({
    where: {
      userId_clientOrganizationId: {
        userId: clientUser.id,
        clientOrganizationId: client.id,
      },
    },
    update: { status: "ACTIVE", portalRole: "OWNER_ADMIN", acceptedAt: new Date() },
    create: {
      userId: clientUser.id,
      clientOrganizationId: client.id,
      status: "ACTIVE",
      portalRole: "OWNER_ADMIN",
      acceptedAt: new Date(),
    },
  });

  const assignment = await prisma.employmentAssignment.findFirst({
    where: { clientOrganizationId: client.id, employeeId: demoEmployee.id },
  });
  if (!assignment) {
    await prisma.employmentAssignment.create({
      data: {
        clientOrganizationId: client.id,
        employeeId: demoEmployee.id,
        novaCompanyId: nw.id,
        status: "ACTIVE",
        effectiveFrom: new Date("2025-04-01"),
      },
    });
  }

  console.log("Seeded admin:", admin.displayName, admin.email);
  console.log("Seeded demo employee:", demoCode, demoPhone, "password DemoEmp#1311");
  console.log("Seeded demo client:", clientSlug, "finance@acme-demo.example", "password ClientDemo#1311");
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
