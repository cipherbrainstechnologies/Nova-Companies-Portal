import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";

export default async function PayslipsAdminPage() {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const slips = await prisma.payslip.findMany({
    include: { employee: true, payrollRun: true, company: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminShell title={t("en", "admin.payslips")}>
      <div className="grid gap-3">
        {slips.map((s) => (
          <Card key={s.id}>
            <div className="font-semibold">
              {s.company.name} · {s.employee.employeeCode} · {s.status}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {String(s.payrollRun.month).padStart(2, "0")}/{s.payrollRun.year} · verify{" "}
              {s.verificationCode}
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
