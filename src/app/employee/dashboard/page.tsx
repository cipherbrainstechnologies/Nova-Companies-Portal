import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { Card, Button } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta, DataRow } from "@/components/industrial";
import { t } from "@/i18n";

export default async function EmployeeDashboardPage() {
  const locale = "en" as const;
  const user = await requirePageUser(["EMPLOYEE"]);
  const employee = user.employeeId
    ? await prisma.employee.findUnique({
        where: { id: user.employeeId },
        include: { company: true, contact: true },
      })
    : null;

  return (
    <PublicChrome
      brand={t(locale, "brand")}
      right={
        <Link href="/employee/payslips">
          <Button variant="outline">{t(locale, "employee.payslips")}</Button>
        </Link>
      }
    >
      <BracketLabel>EMPLOYEE / PROFILE</BracketLabel>
      <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.75rem)]">
        {t(locale, "employee.dashboard")}
      </h1>
      <hr className="rule-accent mb-6 mt-3" />
      {employee ? (
        <div className="grid gap-3">
          <DataRow
            title={`${employee.firstName} ${employee.lastName}`}
            subtitle={`${employee.employeeCode} · ${employee.company.name}`}
          />
          <Card>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="meta text-[var(--muted)]">Designation</dt>
                <dd>{employee.designation ?? "—"}</dd>
              </div>
              <div>
                <dt className="meta text-[var(--muted)]">Department</dt>
                <dd>{employee.department ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="meta text-[var(--muted)]">Contact</dt>
                <dd className="normal-case tracking-[0.04em]">
                  {employee.contact?.officialEmail ?? employee.contact?.personalEmail ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : (
        <Meta>{t(locale, "employee.profileUnavailable")}</Meta>
      )}
    </PublicChrome>
  );
}
