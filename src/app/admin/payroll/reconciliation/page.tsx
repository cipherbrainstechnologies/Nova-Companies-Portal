import { requirePageUser } from "@/server/auth/page-guard";
import { AdminShell } from "@/components/admin-shell";
import { companyFacade } from "@/server/facades/company-facade";
import { prisma } from "@/server/db";
import { requirePermission, AuthzError } from "@/server/rbac/permissions";
import {
  listPayrollReconciliationItems,
  type ReconciliationFilter,
} from "@/server/payroll/unresolved-payments";
import { listPreferredAllocatableTransactions } from "@/server/payroll/payment-auto-match";
import {
  DEFAULT_PAYMENT_SEARCH_DAYS_AFTER,
  DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE,
} from "@/server/payroll/period-eligibility";
import { PayrollReconciliationWorkspace } from "@/app/admin/payroll/reconciliation-workspace";
import { AlertBanner } from "@/components/industrial";
import Link from "next/link";

const FILTERS = new Set<ReconciliationFilter>([
  "unresolved",
  "unmatched",
  "below_expected",
  "above_expected",
  "missing_structure",
  "ambiguous",
  "resolved",
  "all",
]);

async function can(user: Parameters<typeof requirePermission>[0]["user"], companyId: string, module: Parameters<typeof requirePermission>[0]["module"], action: Parameters<typeof requirePermission>[0]["action"]) {
  try {
    await requirePermission({ user, companyId, module, action });
    return true;
  } catch (error) {
    if (error instanceof AuthzError) return false;
    throw error;
  }
}

export default async function PayrollReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string;
    runId?: string;
    filter?: string;
    statementId?: string;
  }>;
}) {
  const user = await requirePageUser(["SUPER_ADMIN", "OPERATIONS_MANAGER"]);
  const sp = await searchParams;
  const companies = await companyFacade.listCompanies();
  const companyId = sp.companyId ?? companies[0]?.id;
  if (!companyId) {
    return (
      <AdminShell title="Reconciliation" description="No companies available." userName={user.email ?? user.phone} userRole={user.globalRole}>
        <AlertBanner tone="warning">Create a company before reconciling payments.</AlertBanner>
      </AdminShell>
    );
  }

  const canView =
    (await can(user, companyId, "statements", "view")) ||
    (await can(user, companyId, "payroll", "view")) ||
    (await can(user, companyId, "statements", "reconcile"));
  if (!canView) {
    return (
      <AdminShell title="Reconciliation" description="Permission required." userName={user.email ?? user.phone} userRole={user.globalRole}>
        <AlertBanner tone="danger">You do not have permission to view reconciliation for this company.</AlertBanner>
      </AdminShell>
    );
  }

  const canEdit = await can(user, companyId, "statements", "reconcile");
  const canApprove =
    canEdit &&
    ((await can(user, companyId, "payroll", "approve")) ||
      (await can(user, companyId, "statements", "reconcile")));

  let runId = sp.runId;
  if (!runId) {
    const latest = await prisma.payrollRun.findFirst({
      where: { companyId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { id: true },
    });
    runId = latest?.id;
  }

  if (!runId) {
    return (
      <AdminShell
        title="Reconciliation"
        description="Resolve unmatched and variance payments before issuing payslips."
        userName={user.email ?? user.phone}
        userRole={user.globalRole}
      >
        <AlertBanner tone="warning">
          No payroll run exists for this company yet.{" "}
          <Link href={`/admin/payroll?companyId=${companyId}`} className="font-semibold underline">
            Create a payroll run
          </Link>{" "}
          first.
        </AlertBanner>
      </AdminShell>
    );
  }

  const filter = FILTERS.has(sp.filter as ReconciliationFilter)
    ? (sp.filter as ReconciliationFilter)
    : "unresolved";

  const [bundle, employees] = await Promise.all([
    listPayrollReconciliationItems({ companyId, payrollRunId: runId, filter }),
    prisma.employee.findMany({
      where: {
        companyId,
        status: { in: ["ACTIVE", "CONTACT_DETAILS_REQUIRED", "BLOCKED", "EXITED"] },
      },
      select: { id: true, employeeCode: true, firstName: true, lastName: true, displayName: true },
      orderBy: { employeeCode: "asc" },
    }),
  ]);

  const allocatableTransactions = await listPreferredAllocatableTransactions({
    companyId,
    year: bundle.run.year,
    month: bundle.run.month,
    daysBefore: DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE,
    daysAfter: DEFAULT_PAYMENT_SEARCH_DAYS_AFTER,
  });

  const latestMatch = bundle.items
    .map((item) => item.searchWindowDisplay)
    .find(Boolean);

  return (
    <AdminShell
      title="Payment reconciliation"
      description="Review bank payments against payroll lines for the selected salary month. Resolving a payment never issues or emails a payslip."
      userName={user.email ?? user.phone}
      userRole={user.globalRole}
    >
      <PayrollReconciliationWorkspace
        companyId={companyId}
        runId={bundle.run.id}
        year={bundle.run.year}
        month={bundle.run.month}
        companyName={bundle.run.companyName}
        items={bundle.items}
        unresolvedCount={bundle.unresolvedCount}
        filterCounts={bundle.filterCounts}
        activeFilter={filter}
        searchWindowDisplay={
          latestMatch ??
          `Default window: −${DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE} / +${DEFAULT_PAYMENT_SEARCH_DAYS_AFTER} days around ${String(bundle.run.month).padStart(2, "0")}/${bundle.run.year}`
        }
        defaultDaysBefore={DEFAULT_PAYMENT_SEARCH_DAYS_BEFORE}
        defaultDaysAfter={DEFAULT_PAYMENT_SEARCH_DAYS_AFTER}
        employees={employees.map((employee) => ({
          id: employee.id,
          label: `${employee.employeeCode} · ${employee.displayName?.trim() || `${employee.firstName} ${employee.lastName}`}`,
        }))}
        allocatableTransactions={allocatableTransactions}
        canEdit={canEdit}
        canApprove={canApprove}
        approvalBlockedReason={
          !canEdit
            ? "Statements reconcile permission is required to edit."
            : !canApprove
              ? "Payroll approve permission is required to approve for issue; you can still map and save for review."
              : undefined
        }
      />
    </AdminShell>
  );
}
