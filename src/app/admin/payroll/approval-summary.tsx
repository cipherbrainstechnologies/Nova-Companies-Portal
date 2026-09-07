import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { AlertBanner, BracketLabel, Meta, StatCell } from "@/components/industrial";
import { isIssuablePaymentStatus, isUnresolvedPaymentStatus } from "@/server/payroll/payment-decision";
import { IssueApprovedButton } from "./issue-approved-button";

/**
 * Pre-issue snapshot for a payroll run: what matched cleanly, what a human still owes a
 * decision on, and exactly how many payslips the "issue approved only" action will send.
 */
export async function ApprovalSummary({
  companyId,
  runId,
}: {
  companyId: string;
  runId?: string;
}) {
  const run = runId
    ? await prisma.payrollRun.findFirst({ where: { id: runId, companyId } })
    : await prisma.payrollRun.findFirst({
        where: { companyId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });

  if (!run) {
    return (
      <Card>
        <BracketLabel>Approval summary</BracketLabel>
        <p className="mt-3 text-sm text-[var(--nova-muted)]">
          No payroll run yet for this company. Create a run for the salary month to see
          reconciliation and issue readiness.
        </p>
      </Card>
    );
  }

  const [lines, emailCounts] = await Promise.all([
    prisma.payrollEmployeeLine.findMany({
      where: { payrollRunId: run.id },
      select: { id: true, status: true, paymentStatus: true },
    }),
    prisma.payslipEmailDelivery.groupBy({
      by: ["status"],
      where: { payslip: { payrollRunId: run.id } },
      _count: { _all: true },
    }),
  ]);

  const exactMatches = lines.filter((line) => line.paymentStatus === "MATCHED_EXACT").length;
  const requiringReview = lines.filter((line) =>
    isUnresolvedPaymentStatus(line.paymentStatus),
  ).length;
  const approved = lines.filter((line) => line.status === "APPROVED").length;
  const approvedLines = lines.filter((line) => line.status === "APPROVED");
  const toIssue = approvedLines.filter((line) => isIssuablePaymentStatus(line.paymentStatus)).length;
  const blocked = approvedLines.length - toIssue;

  const emailsByStatus = Object.fromEntries(
    emailCounts.map((row) => [row.status, row._count._all]),
  ) as Record<string, number>;
  const emailsSent = (emailsByStatus.SENT ?? 0) + (emailsByStatus.DELIVERED ?? 0);
  const emailsFailed = (emailsByStatus.FAILED ?? 0) + (emailsByStatus.BOUNCED ?? 0);
  const emailsQueued = emailsByStatus.QUEUED ?? 0;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BracketLabel>Approval summary</BracketLabel>
          <Meta className="mt-1">
            {String(run.month).padStart(2, "0")}/{run.year} · run status {run.status}
          </Meta>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCell label="Exact matches" value={exactMatches} />
        <StatCell
          label="Requiring review"
          value={requiringReview}
          alert={requiringReview > 0}
          hint={requiringReview ? "Never issued automatically" : undefined}
        />
        <StatCell label="Approved" value={approved} />
        <StatCell label="To issue" value={toIssue} />
        <StatCell
          label="Emails"
          value={emailsSent}
          hint={`${emailsQueued} queued · ${emailsFailed} failed`}
          alert={emailsFailed > 0}
        />
      </div>

      {requiringReview ? (
        <AlertBanner tone="warning">
          {requiringReview} payment(s) differ from the expected net or have no confident match.
          Resolve them in reconciliation; issuing approved payslips will skip them.
        </AlertBanner>
      ) : null}

      {emailsFailed ? (
        <AlertBanner tone="danger">
          {emailsFailed} notification(s) failed. The payslips stay issued — resend the email from
          the payslip once the address is corrected.
        </AlertBanner>
      ) : null}

      <IssueApprovedButton
        runId={run.id}
        companyId={companyId}
        month={run.month}
        year={run.year}
        count={toIssue}
        blockedCount={blocked}
      />
    </Card>
  );
}
