import Link from "next/link";
import { requirePageUser } from "@/server/auth/page-guard";
import { prisma } from "@/server/db";
import { Button, Card } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta, DataRow } from "@/components/industrial";
import { t } from "@/i18n";
import { DownloadButton } from "./download-button";

export default async function EmployeePayslipsPage() {
  const locale = "en" as const;
  const user = await requirePageUser(["EMPLOYEE"]);
  const slips = user.employeeId
    ? await prisma.payslip.findMany({
        where: { employeeId: user.employeeId, status: "ISSUED" },
        include: { payrollRun: true, company: true },
        orderBy: { issuedAt: "desc" },
      })
    : [];

  return (
    <PublicChrome
      brand={t(locale, "brand")}
      right={
        <Link href="/employee/dashboard">
          <Button variant="ghost">{t(locale, "employee.dashboard")}</Button>
        </Link>
      }
    >
      <BracketLabel>EMPLOYEE / DOCUMENTS</BracketLabel>
      <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.75rem)]">
        {t(locale, "employee.payslips")}
      </h1>
      <hr className="rule-accent mb-6 mt-3" />
      <div className="grid gap-3">
        {slips.map((s) => (
          <DataRow
            key={s.id}
            title={`${s.company.name} · ${String(s.payrollRun.month).padStart(2, "0")}/${s.payrollRun.year}`}
            subtitle={`Status ${s.status}`}
            action={<DownloadButton payslipId={s.id} label={t(locale, "employee.download")} />}
          />
        ))}
        {!slips.length ? (
          <Card>
            <Meta>{t(locale, "employee.noPayslips")}</Meta>
          </Card>
        ) : null}
      </div>
    </PublicChrome>
  );
}
