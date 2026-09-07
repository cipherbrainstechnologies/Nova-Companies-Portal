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

  const adminPhone = "+919999000001";
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {},
    create: {
      phone: adminPhone,
      email: "admin@nova.local",
      passwordHash: await hashPassword("ChangeMeNow!!"),
      globalRole: "SUPER_ADMIN",
      mustChangePassword: true,
    },
  });

  const nw = await prisma.company.upsert({
    where: { prefix: "NW" },
    update: {},
    create: {
      name: "Nova Workforce",
      prefix: "NW",
      gstin: "Needs configuration",
      address: "Needs configuration",
      sequence: { create: { nextNumber: 20 } },
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
    await seedDefaultProfitPolicies(company.id);
  }

  console.log("Seeded super admin", admin.phone, "companies", nw.prefix, nq.prefix);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
