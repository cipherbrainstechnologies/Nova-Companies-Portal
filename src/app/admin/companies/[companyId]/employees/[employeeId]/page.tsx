import Link from "next/link";
import { employeeFacade } from "@/server/facades/employee-facade";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { BracketLabel, MoneyValue, StatusBadge } from "@/components/industrial";
import { deriveExpectedMonthlyNet, toAmount } from "@/server/payroll/salary-structure";
import { groupPayslipsAsFolders } from "@/server/documents/folder-tree";
import { PayslipFolderBrowser } from "@/components/payslip-folder-browser";
import { t } from "@/i18n";
import { SalarySlipForm } from "@/app/admin/employees/salary-slip-form";
import { SalaryStructureForm } from "@/app/admin/employees/salary-structure-form";
import { EmployeeProfileActions } from "@/app/admin/employees/employee-profile-actions";
import {
  EditEmployeeForm,
  editEmployeeInitialFrom,
} from "@/app/admin/employees/edit-employee-form";
import { EmployeeDocumentFolders } from "@/app/admin/employees/employee-document-folders";
import { listEmployeeDocuments } from "@/server/employees/employee-documents";
import { requirePageUser } from "@/server/auth/page-guard";
import { AuthzError, requirePermission } from "@/server/rbac/permissions";

function basicFromStructure(componentsJson: unknown): number | undefined {
  if (!componentsJson || typeof componentsJson !== "object") return undefined;
  const obj = componentsJson as Record<string, unknown>;
  for (const key of ["BASIC", "basic", "Basic"]) {
    const v = obj[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

export default async function CompanyEmployeeDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; employeeId: string }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const { companyId, employeeId } = await params;
  const employee = await employeeFacade.getById(employeeId, companyId);
  const defaultBasic = basicFromStructure(employee.salaryStructure?.componentsJson);

  let canEdit = false;
  try {
    await requirePermission({
      user,
      companyId,
      module: "employees",
      action: "edit",
    });
    canEdit = true;
  } catch (error) {
    if (!(error instanceof AuthzError)) throw error;
  }

  const [versions, aliases, slips, companySettings, documents] = await Promise.all([
    employeeFacade.listSalaryStructureVersions(employeeId),
    prisma.employeePaymentAlias.findMany({
      where: { employeeId },
      orderBy: { alias: "asc" },
    }),
    prisma.payslip.findMany({
      where: { employeeId, companyId, status: "ISSUED" },
      include: { payrollRun: true, company: true, employee: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.company
      .findUnique({
        where: { id: companyId },
        select: { id: true, defaultMonthlyProfessionalTax: true },
      })
      .catch(async () => {
        // Older DBs may lack defaultMonthlyProfessionalTax until migrate deploy.
        try {
          return await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true },
          });
        } catch {
          return null;
        }
      }),
    listEmployeeDocuments(employeeId).catch((error) => {
      console.error("employee documents unavailable", error);
      return [];
    }),
  ]);
  const payslipTree = groupPayslipsAsFolders(
    slips.map((s) => ({
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
  const structure = employee.salaryStructure;
  const expectedMonthlyNet = structure ? deriveExpectedMonthlyNet(structure) : null;
  const componentMap = Object.fromEntries(
    Object.entries((structure?.componentsJson ?? {}) as Record<string, unknown>).flatMap(
      ([code, value]) => {
        const amount = toAmount(value);
        return amount == null ? [] : [[code, amount] as const];
      },
    ),
  );
  const employeeName =
    employee.displayName?.trim() || `${employee.firstName} ${employee.lastName}`.trim();

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/admin/companies/${companyId}/employees`}
          className="text-sm font-medium text-[var(--nova-teal)] hover:underline"
        >
          ← {t("en", "admin.employees")}
        </Link>
      </div>

      <Card className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <BracketLabel>{t("en", "admin.profileSummary")}</BracketLabel>
            <h2 className="mt-2 text-xl font-semibold text-[var(--nova-ink)]">
              {employee.employeeCode} · {employeeName}
            </h2>
            <p className="mt-1 text-sm text-[var(--nova-muted)]">
              {employee.designation ?? "—"} · {employee.company.name}
            </p>
          </div>
          <StatusBadge
            status={employee.status}
            tone={employee.status === "ACTIVE" ? "success" : "neutral"}
          />
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.designation")}
            </dt>
            <dd className="mt-1 text-sm">{employee.designation ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.department")}
            </dt>
            <dd className="mt-1 text-sm">{employee.department ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.company")}
            </dt>
            <dd className="mt-1 text-sm">{employee.company.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.primaryPhone")}
            </dt>
            <dd className="mt-1 text-sm">{employee.contact?.primaryPhone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.officialEmail")}
            </dt>
            <dd className="mt-1 text-sm">{employee.contact?.officialEmail ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-5 space-y-3 border-t border-[var(--nova-border)] pt-4">
          <EditEmployeeForm
            companyId={companyId}
            employeeId={employeeId}
            canEdit={canEdit}
            initial={editEmployeeInitialFrom(employee)}
          />
          <EmployeeProfileActions
            companyId={companyId}
            employeeId={employeeId}
            employeeCode={employee.employeeCode}
            status={employee.status}
            canEdit={canEdit}
          />
        </div>
      </Card>

      <section className="mb-8">
        <EmployeeDocumentFolders
          companyId={companyId}
          employeeId={employeeId}
          employeeName={employeeName}
          canEdit={canEdit}
          initialDocuments={documents}
        />
      </section>

      <section className="mb-8 space-y-4">
        <SalaryStructureForm
          companyId={companyId}
          employeeId={employeeId}
          defaultMonthlyProfessionalTax={
            companySettings &&
            "defaultMonthlyProfessionalTax" in companySettings &&
            companySettings.defaultMonthlyProfessionalTax != null
              ? Number(companySettings.defaultMonthlyProfessionalTax)
              : 200
          }
          initial={{
            annualCtc: toAmount(structure?.annualCtc),
            monthlyGross: toAmount(structure?.monthlyGross),
            monthlyTds: toAmount(structure?.monthlyTds),
            monthlyPt: toAmount(structure?.monthlyPt),
            expectedMonthlyNet: toAmount(structure?.expectedMonthlyNet),
            effectiveFrom: structure?.effectiveFrom?.toISOString() ?? null,
            components: componentMap,
            paymentAliases: aliases.map((alias) => alias.alias),
            accountHolderName: employee.bankAccount?.accountHolderName ?? null,
            notes: structure?.notes ?? null,
          }}
        />

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BracketLabel>Salary change / hike history</BracketLabel>
            <StatusBadge
              status={
                expectedMonthlyNet != null
                  ? `Expected net set · v${structure?.version ?? 1}`
                  : "No expected net recorded"
              }
              tone={expectedMonthlyNet != null ? "success" : "warning"}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--nova-muted)]">
            Each save creates a version. The effective-from date is when the hike or structure change
            applied.
          </p>
          {versions.length ? (
            <ul className="mt-4 divide-y divide-[var(--nova-border)]">
              {versions.map((version, index) => {
                const prior = versions[index + 1];
                const currentNet =
                  version.expectedMonthlyNet != null ? Number(version.expectedMonthlyNet) : null;
                const priorNet =
                  prior?.expectedMonthlyNet != null ? Number(prior.expectedMonthlyNet) : null;
                const delta =
                  currentNet != null && priorNet != null ? currentNet - priorNet : null;
                return (
                  <li key={version.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <span className="w-16 text-sm font-semibold text-[var(--nova-ink)]">
                      v{version.version}
                    </span>
                    <span className="text-sm text-[var(--nova-text-secondary)]">
                      From {version.effectiveFrom.toLocaleDateString()}
                      {version.effectiveTo
                        ? ` → ${version.effectiveTo.toLocaleDateString()}`
                        : " → current"}
                    </span>
                    <span className="text-sm text-[var(--nova-text-secondary)]">
                      Net{" "}
                      {currentNet != null ? <MoneyValue value={currentNet} /> : "—"}
                    </span>
                    {delta != null && delta !== 0 ? (
                      <span
                        className={`text-sm font-semibold ${
                          delta > 0 ? "text-[var(--nova-success)]" : "text-[var(--nova-danger)]"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        <MoneyValue value={delta} /> hike
                      </span>
                    ) : null}
                    {version.notes ? (
                      <span className="text-xs text-[var(--nova-muted)]">{version.notes}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--nova-muted)]">
              No versions recorded yet. Saving the structure above creates version 1.
            </p>
          )}
        </Card>
      </section>

      <section className="mb-8">
        <BracketLabel>Issued salary slips</BracketLabel>
        <p className="mb-3 mt-2 text-sm text-[var(--nova-muted)]">
          Payroll-issued payslips filed by assessment year, then month. Manual uploads also go in
          Documents → Salary Slips.
        </p>
        <PayslipFolderBrowser tree={payslipTree} allowDownload singleEmployee />
      </section>

      <SalarySlipForm
        companyId={companyId}
        employeeId={employeeId}
        defaultBasic={defaultBasic}
      />
    </div>
  );
}
