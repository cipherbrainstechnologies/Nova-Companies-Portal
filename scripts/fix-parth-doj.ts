/**
 * One-shot audit/fix for Parth Virani DOJ on Nova Qore.
 * Does not rewrite issued payslip snapshots.
 *
 * Usage: npx tsx scripts/fix-parth-doj.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CORRECT_DOJ = new Date(Date.UTC(2026, 7, 3)); // 3 August 2026

async function main() {
  const company = await prisma.company.findFirst({
    where: { OR: [{ prefix: "NQ" }, { name: { contains: "Qore", mode: "insensitive" } }] },
  });
  if (!company) {
    console.log("Nova Qore company not found — nothing to fix.");
    return;
  }

  const employees = await prisma.employee.findMany({
    where: {
      companyId: company.id,
      OR: [
        { employeeCode: { equals: "NQ025", mode: "insensitive" } },
        { firstName: { contains: "Parth", mode: "insensitive" }, lastName: { contains: "Virani", mode: "insensitive" } },
      ],
    },
    include: {
      payslips: {
        where: { payrollRun: { year: 2026, month: 8 } },
        select: { id: true, status: true },
      },
    },
  });

  if (!employees.length) {
    console.log("Parth Virani / NQ025 not found under Nova Qore. Create/import the employee first.");
    return;
  }

  for (const emp of employees) {
    const current = emp.dateOfJoining?.toISOString().slice(0, 10) ?? null;
    console.log(
      `Found ${emp.employeeCode} ${emp.firstName} ${emp.lastName}: DOJ=${current}; Aug2026 slips=${emp.payslips.length}`,
    );
    const issued = emp.payslips.some((p) => p.status === "ISSUED" || p.status === "ISSUING");
    if (issued) {
      console.log(
        "  Issued Aug-2026 payslip exists — updating employee DOJ only (issued PDF snapshot left immutable).",
      );
    }
    if (current === "2026-08-03") {
      console.log("  DOJ already correct (2026-08-03).");
      continue;
    }
    await prisma.employee.update({
      where: { id: emp.id },
      data: { dateOfJoining: CORRECT_DOJ },
    });
    console.log(`  Updated DOJ ${current} → 2026-08-03`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
