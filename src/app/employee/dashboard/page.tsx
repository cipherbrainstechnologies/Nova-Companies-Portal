import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { Card, Button } from "@/components/ui";
import { EmployeeShell } from "@/components/admin-shell";
import { StatusBadge, EmptyState } from "@/components/industrial";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import Link from "next/link";
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

  const latest = user.employeeId
    ? await prisma.payslip.findFirst({
        where: { employeeId: user.employeeId, status: "ISSUED" },
        include: { payrollRun: true },
        orderBy: { issuedAt: "desc" },
      })
    : null;

  const recentSlips = user.employeeId
    ? await prisma.payslip.findMany({
        where: { employeeId: user.employeeId, status: "ISSUED" },
        include: { payrollRun: true, company: true, employee: true },
        orderBy: { issuedAt: "desc" },
        take: 12,
      })
    : [];

  const tree = groupPayslipsAsFolders(
    recentSlips.map((s) => ({
      id: s.id,
      status: s.status,
      verificationCode: s.verificationCode,
      currentVersion: s.currentVersion,
      employeeCode: s.employee.employeeCode,
      employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
      companyPrefix: s.company.prefix,
      year: s.payrollRun.year,
      month: s.payrollRun.month,
    })),
  );

  const fullName = employee ? `${employee.firstName} ${employee.lastName}` : undefined;

  return (
    <EmployeeShell
      title={`Welcome${employee ? `, ${employee.firstName}` : ""}`}
      description="Your profile and latest salary slips. Downloads are secured and audited."
      employeeName={fullName}
    >
      {employee ? (
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nova-teal-soft)] text-lg font-bold text-[var(--nova-teal)]">
                {employee.firstName.slice(0, 1)}
                {employee.lastName.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[var(--nova-ink)]">{fullName}</h2>
                <p className="mt-1 text-sm text-[var(--nova-muted)]">
                  {employee.employeeCode} · {employee.designation ?? "—"} · {employee.company.name}
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                      Department
                    </dt>
                    <dd className="text-sm">{employee.department ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                      Contact
                    </dt>
                    <dd className="text-sm">
                      {employee.contact?.officialEmail ?? employee.contact?.personalEmail ?? "—"}
                    </dd>
                  </div>
                </dl>
              </div>
              <Link href="/change-password">
                <Button variant="outline" size="sm">
                  Account security
                </Button>
              </Link>
            </div>
          </Card>

          {latest ? (
            <Card className="border-[var(--nova-teal)]/30 bg-gradient-to-br from-[var(--nova-surface)] to-[var(--nova-teal-soft)]/40">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--nova-teal)]">
                Latest salary slip
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-[var(--nova-ink)]">
                    {String(latest.payrollRun.month).padStart(2, "0")}/{latest.payrollRun.year}
                  </div>
                  <p className="mt-1 text-sm text-[var(--nova-muted)]">
                    Issued {latest.issuedAt ? latest.issuedAt.toLocaleDateString() : "—"} · v
                    {latest.currentVersion}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={latest.status} tone="success" />
                  <Link href="/employee/payslips">
                    <Button size="sm">{t(locale, "employee.download")}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No issued payslips yet"
              description="When payroll issues your slip, it will appear here for download."
            />
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                Payslip history
              </h3>
              <Link
                href="/employee/payslips"
                className="text-sm font-semibold text-[var(--nova-teal)] hover:underline"
              >
                View all
              </Link>
            </div>
            <PayslipFolderBrowser tree={tree} allowDownload />
          </section>
        </div>
      ) : (
        <EmptyState title={t(locale, "employee.profileUnavailable")} />
      )}
    </EmployeeShell>
  );
}
