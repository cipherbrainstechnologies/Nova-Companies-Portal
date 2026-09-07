import { prisma } from "@/server/db";
import { Card } from "@/components/ui";
import { BracketLabel, DataRow, EmptyState, Meta, StatusBadge } from "@/components/industrial";
import { ResendEmailButton } from "./resend-email-button";

const DELIVERY_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  SENT: "success",
  DELIVERED: "success",
  QUEUED: "info",
  FAILED: "danger",
  BOUNCED: "danger",
};

/**
 * Delivery state for recently issued payslips. Resending a notification never changes
 * the issued payslip itself.
 */
export async function EmailDeliveryPanel({ take = 20 }: { take?: number }) {
  const slips = await prisma.payslip.findMany({
    where: { status: "ISSUED" },
    include: {
      employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      payrollRun: { select: { year: true, month: true } },
      emailDeliveries: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { issuedAt: "desc" },
    take,
  });

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BracketLabel>Payslip email delivery</BracketLabel>
        <Meta>Notifications never contain salary amounts</Meta>
      </div>
      <div className="mt-4 grid gap-3">
        {slips.map((slip) => {
          const latest = slip.emailDeliveries[0];
          return (
            <DataRow
              key={slip.id}
              title={`${slip.employee.employeeCode} · ${slip.employee.firstName} ${slip.employee.lastName}`}
              subtitle={
                latest
                  ? `${String(slip.payrollRun.month).padStart(2, "0")}/${slip.payrollRun.year} · ${latest.toEmail}${latest.failureReason ? ` · ${latest.failureReason}` : ""}`
                  : `${String(slip.payrollRun.month).padStart(2, "0")}/${slip.payrollRun.year} · no notification sent yet`
              }
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={latest?.status ?? "NOT SENT"}
                    tone={latest ? (DELIVERY_TONE[latest.status] ?? "neutral") : "neutral"}
                  />
                  <ResendEmailButton payslipId={slip.id} />
                </div>
              }
            />
          );
        })}
        {!slips.length ? (
          <EmptyState
            title="No issued payslips yet"
            description="Notifications appear here once payslips are issued."
          />
        ) : null}
      </div>
    </Card>
  );
}
