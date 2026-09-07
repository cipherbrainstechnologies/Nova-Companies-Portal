import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { DownloadButton } from "./download-button";

export default async function EmployeePayslipsPage() {
  const user = await requirePageUser(["EMPLOYEE"]);
  const slips = user.employeeId
    ? await prisma.payslip.findMany({
        where: { employeeId: user.employeeId, status: "ISSUED" },
        include: { payrollRun: true, company: true },
        orderBy: { issuedAt: "desc" },
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="h-display mb-6 text-3xl font-bold">{t("en", "employee.payslips")}</h1>
      <div className="grid gap-3">
        {slips.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {s.company.name} · {String(s.payrollRun.month).padStart(2, "0")}/
                  {s.payrollRun.year}
                </div>
                <div className="text-sm text-[var(--muted)]">Status {s.status}</div>
              </div>
              <DownloadButton payslipId={s.id} label={t("en", "employee.download")} />
            </div>
          </Card>
        ))}
        {!slips.length ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">No issued payslips yet.</p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
