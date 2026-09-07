"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { StatusBadge, EmptyState, Meta } from "@/components/industrial";
import { t } from "@/i18n";

type MonthNode = {
  period: string;
  slips: Array<{
    id: string;
    status: string;
    verificationCode: string;
    version: number;
    pathLabel: string;
  }>;
};

type EmployeeNode = {
  employeeKey: string;
  employeeCode: string;
  employeeName: string;
  companyPrefix: string;
  months: MonthNode[];
};

function statusTone(status: string): "success" | "warning" | "info" | "neutral" {
  if (status === "ISSUED") return "success";
  if (status === "APPROVED" || status === "ISSUING") return "info";
  if (status === "DRAFT" || status === "NEEDS_REVIEW") return "warning";
  return "neutral";
}

export function PayslipFolderBrowser({
  tree,
  allowDownload,
}: {
  tree: EmployeeNode[];
  allowDownload?: boolean;
}) {
  const [openEmployee, setOpenEmployee] = useState<string | null>(tree[0]?.employeeKey ?? null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  if (!tree.length) {
    return (
      <EmptyState
        title={t("en", "employee.noPayslips")}
        description="Issued salary slips will appear here once payroll is completed."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow)]">
      <div className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)] px-4 py-3">
        <Meta>Payslip folders</Meta>
      </div>
      <div className="divide-y divide-[var(--nova-border)]">
        {tree.map((emp) => {
          const empOpen = openEmployee === emp.employeeKey;
          return (
            <div key={emp.employeeKey}>
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--nova-surface-muted)]"
                onClick={() => {
                  setOpenEmployee(empOpen ? null : emp.employeeKey);
                  setOpenMonth(null);
                }}
                aria-expanded={empOpen}
              >
                <span className="text-sm font-semibold text-[var(--nova-ink)]">
                  {emp.companyPrefix} / {emp.employeeCode}
                </span>
                <span className="text-sm text-[var(--nova-muted)]">{emp.employeeName}</span>
              </button>
              {empOpen ? (
                <div className="bg-[var(--nova-canvas)]/50">
                  {emp.months.map((m) => {
                    const monthKey = `${emp.employeeKey}:${m.period}`;
                    const monthOpen = openMonth === monthKey;
                    return (
                      <div key={m.period} className="border-t border-[var(--nova-border)]">
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center gap-2 px-6 py-2.5 text-left text-sm font-medium text-[var(--nova-text-secondary)] hover:bg-[var(--nova-surface)]"
                          onClick={() => setOpenMonth(monthOpen ? null : monthKey)}
                          aria-expanded={monthOpen}
                        >
                          <span className="text-[var(--nova-teal)]">{monthOpen ? "▾" : "▸"}</span>
                          {m.period}
                        </button>
                        {monthOpen ? (
                          <ul className="space-y-2 px-6 pb-4">
                            {m.slips.map((s) => (
                              <li
                                key={s.id}
                                className="flex flex-col gap-3 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-[var(--nova-ink)]">
                                    {s.pathLabel}
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <StatusBadge status={s.status} tone={statusTone(s.status)} />
                                    <span className="text-xs text-[var(--nova-muted)]">
                                      v{s.version}
                                    </span>
                                    <Link
                                      href={`/verify-document?code=${encodeURIComponent(s.verificationCode)}`}
                                      className="text-xs font-medium text-[var(--nova-teal)] hover:underline"
                                    >
                                      Verify document
                                    </Link>
                                  </div>
                                </div>
                                {allowDownload ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const res = await fetch(`/api/payslips/${s.id}/download`);
                                      const data = await res.json();
                                      if (res.ok && data.url) window.location.href = data.url;
                                      else alert(data.error ?? t("en", "common.downloadFailed"));
                                    }}
                                  >
                                    {t("en", "employee.download")}
                                  </Button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
