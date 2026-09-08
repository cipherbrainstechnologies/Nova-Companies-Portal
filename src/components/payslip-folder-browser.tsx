"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { StatusBadge, EmptyState, Meta } from "@/components/industrial";
import { t } from "@/i18n";

type SlipNode = {
  id: string;
  status: string;
  verificationCode: string;
  version: number;
  pathLabel: string;
};

type MonthNode = {
  period: string;
  slips: SlipNode[];
};

type AssessmentYearNode = {
  label: string;
  months: MonthNode[];
};

type EmployeeNode = {
  employeeKey: string;
  employeeCode: string;
  employeeName: string;
  companyPrefix: string;
  months: MonthNode[];
  assessmentYears?: AssessmentYearNode[];
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
  singleEmployee,
}: {
  tree: EmployeeNode[];
  allowDownload?: boolean;
  /** Hide employee accordion when the page is already scoped to one person. */
  singleEmployee?: boolean;
}) {
  const [openEmployee, setOpenEmployee] = useState<string | null>(tree[0]?.employeeKey ?? null);
  const [openAy, setOpenAy] = useState<string | null>(null);
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
        <Meta>Salary slips by assessment year → month</Meta>
      </div>
      <div className="divide-y divide-[var(--nova-border)]">
        {tree.map((emp) => {
          const empOpen = singleEmployee || openEmployee === emp.employeeKey;
          const years =
            emp.assessmentYears?.length
              ? emp.assessmentYears
              : [{ label: "All periods", months: emp.months }];
          return (
            <div key={emp.employeeKey}>
              {!singleEmployee ? (
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--nova-surface-muted)]"
                  onClick={() => {
                    setOpenEmployee(empOpen ? null : emp.employeeKey);
                    setOpenAy(null);
                    setOpenMonth(null);
                  }}
                  aria-expanded={empOpen}
                >
                  <span className="text-sm font-semibold text-[var(--nova-ink)]">
                    {emp.companyPrefix} / {emp.employeeCode}
                  </span>
                  <span className="text-sm text-[var(--nova-muted)]">{emp.employeeName}</span>
                </button>
              ) : null}
              {empOpen ? (
                <div className={singleEmployee ? "" : "bg-[var(--nova-canvas)]/50"}>
                  {years.map((ay) => {
                    const ayKey = `${emp.employeeKey}:${ay.label}`;
                    const ayOpen = openAy === ayKey || (singleEmployee && years.length === 1);
                    return (
                      <div key={ay.label} className="border-t border-[var(--nova-border)]">
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center gap-2 px-5 py-2.5 text-left text-sm font-semibold text-[var(--nova-ink)] hover:bg-[var(--nova-surface)]"
                          onClick={() => {
                            setOpenAy(ayOpen && years.length > 1 ? null : ayKey);
                            setOpenMonth(null);
                          }}
                          aria-expanded={ayOpen}
                        >
                          <span className="text-[var(--nova-teal)]">{ayOpen ? "▾" : "▸"}</span>
                          {ay.label}
                          <span className="ml-auto text-xs font-normal text-[var(--nova-muted)]">
                            {ay.months.length} month{ay.months.length === 1 ? "" : "s"}
                          </span>
                        </button>
                        {ayOpen ? (
                          <div>
                            {ay.months.map((m) => {
                              const monthKey = `${ayKey}:${m.period}`;
                              const monthOpen = openMonth === monthKey;
                              return (
                                <div key={m.period} className="border-t border-[var(--nova-border)]">
                                  <button
                                    type="button"
                                    className="flex min-h-11 w-full items-center gap-2 px-8 py-2.5 text-left text-sm font-medium text-[var(--nova-text-secondary)] hover:bg-[var(--nova-surface)]"
                                    onClick={() => setOpenMonth(monthOpen ? null : monthKey)}
                                    aria-expanded={monthOpen}
                                  >
                                    <span className="text-[var(--nova-teal)]">
                                      {monthOpen ? "▾" : "▸"}
                                    </span>
                                    {m.period}
                                  </button>
                                  {monthOpen ? (
                                    <ul className="space-y-2 px-8 pb-4">
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
                                              <StatusBadge
                                                status={s.status}
                                                tone={statusTone(s.status)}
                                              />
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
                                                const res = await fetch(
                                                  `/api/payslips/${s.id}/download`,
                                                );
                                                const data = await res.json();
                                                if (res.ok && data.url) window.location.href = data.url;
                                                else
                                                  alert(
                                                    data.error ?? t("en", "common.downloadFailed"),
                                                  );
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
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
