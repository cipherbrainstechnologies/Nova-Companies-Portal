import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";

export default async function EmployeeDashboardPage() {
  const user = await requirePageUser(["EMPLOYEE"]);
  const employee = user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: { company: true, contact: true },
      })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="h-display text-3xl font-bold">{t("en", "employee.dashboard")}</h1>
        <Link href="/employee/payslips" className="text-sm text-[var(--accent)]">
          {t("en", "employee.payslips")}
        </Link>
      </div>
      <Card>
        {employee ? (
          <div className="space-y-2 text-sm">
            <div className="text-lg font-semibold">
              {employee.firstName} {employee.lastName}
            </div>
            <div>
              {employee.employeeCode} · {employee.company.name}
            </div>
            <div>
              {employee.designation ?? "—"} · {employee.department ?? "—"}
            </div>
            <div>{employee.contact?.officialEmail ?? employee.contact?.personalEmail}</div>
          </div>
        ) : (
          <p>Profile unavailable</p>
        )}
      </Card>
    </main>
  );
}
