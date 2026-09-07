"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Meta } from "@/components/industrial";
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
      <div className="border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-4">
        <Meta>{t("en", "employee.noPayslips")}</Meta>
      </div>
    );
  }

  return (
    <div className="border-2 border-[var(--ink)]">
      <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-alt)] px-4 py-3">
        <Meta>ROOT / payslips /</Meta>
      </div>
      <div className="divide-y divide-[var(--ink)]">
        {tree.map((emp) => {
          const empOpen = openEmployee === emp.employeeKey;
          return (
            <div key={emp.employeeKey}>
              <button
                type="button"
                className="meta flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--bg-alt)]"
                onClick={() => {
                  setOpenEmployee(empOpen ? null : emp.employeeKey);
                  setOpenMonth(null);
                }}
              >
                <span>
                  {empOpen ? "[-]" : "[+]"} {emp.companyPrefix}/
                  {emp.employeeKey}/
                </span>
                <span className="text-[var(--muted)]">{emp.employeeName}</span>
              </button>
              {empOpen ? (
                <div className="border-t border-[var(--ink)] bg-[var(--bg)]">
                  {emp.months.map((m) => {
                    const monthOpen = openMonth === `${emp.employeeKey}:${m.period}`;
                    return (
                      <div key={m.period} className="border-t border-[var(--ink)]">
                        <button
                          type="button"
                          className="meta flex min-h-12 w-full items-center gap-3 px-6 py-3 text-left hover:bg-[var(--bg-alt)]"
                          onClick={() =>
                            setOpenMonth(monthOpen ? null : `${emp.employeeKey}:${m.period}`)
                          }
                        >
                          {monthOpen ? "[-]" : "[+]"} {m.period}/
                        </button>
                        {monthOpen ? (
                          <ul className="space-y-2 border-t border-[var(--ink)] bg-[var(--bg-alt)] px-6 py-3">
                            {m.slips.map((s) => (
                              <li
                                key={s.id}
                                className="flex flex-col gap-2 border-2 border-[var(--ink)] bg-[var(--bg)] p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <div className="meta break-all text-[var(--ink)]">{s.pathLabel}</div>
                                  <Meta className="mt-1 block text-[var(--muted)]">
                                    {s.status} · v{s.version} · {s.verificationCode}
                                  </Meta>
                                </div>
                                {allowDownload ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-12"
                                    onClick={async () => {
                                      const res = await fetch(`/api/payslips/${s.id}/download`);
                                      const data = await res.json();
                                      if (res.ok && data.url) window.location.href = data.url;
                                      else alert(data.error ?? t("en", "common.downloadFailed"));
                                    }}
                                  >
                                    {`>>> ${t("en", "employee.download")}`}
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
