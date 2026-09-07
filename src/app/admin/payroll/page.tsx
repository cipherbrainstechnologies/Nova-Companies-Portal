import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { t } from "@/i18n";
import { CreatePayrollForm } from "./create-form";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  const runs = companyId
    ? await prisma.payrollRun.findMany({
        where: { companyId },
        include: { _count: { select: { lines: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      })
    : [];

  return (
    <AdminShell title={t("en", "admin.payroll")}>
      <div className="mb-4 flex flex-wrap gap-2">
        {companies.map((c) => (
          <a
            key={c.id}
            href={`/admin/payroll?companyId=${c.id}`}
            className={`rounded-md px-3 py-1 text-sm ${
              c.id === companyId ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-soft)]"
            }`}
          >
            {c.name}
          </a>
        ))}
      </div>
      {companyId ? <CreatePayrollForm companyId={companyId} /> : null}
      <div className="mt-6 grid gap-3">
        {runs.map((r) => (
          <Card key={r.id}>
            <div className="font-semibold">
              {String(r.month).padStart(2, "0")}/{r.year} — {r.status}
            </div>
            <div className="text-sm text-[var(--muted)]">{r._count.lines} employee lines</div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
