"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Input } from "@/components/ui";
import { StatusBadge, EmptyState } from "@/components/industrial";
import { HoverTip } from "@/components/hover-tip";
import { t } from "@/i18n";

export type EmployeeListRow = {
  id: string;
  companyId: string;
  companyName: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  status: string;
  email: string;
  phone: string;
};

export function EmployeeRosterTable({ rows }: { rows: EmployeeListRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [
        r.firstName,
        r.lastName,
        r.employeeCode,
        r.email,
        r.phone,
        r.companyName,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, rows]);

  if (!rows.length) {
    return (
      <EmptyState
        title="No employees in this company"
        description="Create an employee record to allocate an ID and enable the employee portal."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-w-md">
        <label htmlFor="employee-search" className="sr-only">
          Search employees
        </label>
        <Input
          id="employee-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, code, company…"
        />
      </div>

      <div className="overflow-x-auto rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)] text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
            <tr>
              <th className="px-4 py-3">Full name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--nova-border)]">
            {filtered.map((e) => {
              const blocked = e.status === "BLOCKED";
              const href = `/admin/companies/${e.companyId}/employees/${e.id}`;
              return (
                <tr key={e.id} className="hover:bg-[var(--nova-surface-muted)]/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--nova-ink)]">
                      {e.displayName ?? `${e.firstName} ${e.lastName}`}
                    </div>
                    <div className="text-xs text-[var(--nova-muted)]">{e.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--nova-text-secondary)]">{e.email || "—"}</td>
                  <td className="px-4 py-3 text-[var(--nova-text-secondary)]">{e.phone || "—"}</td>
                  <td className="px-4 py-3 text-[var(--nova-text-secondary)]">{e.companyName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={e.status}
                      tone={blocked ? "neutral" : e.status === "ACTIVE" ? "success" : "warning"}
                    />
                    {e.status === "CONTACT_DETAILS_REQUIRED" ? (
                      <Link href={href} className="mt-1 block text-xs font-semibold text-[var(--nova-teal)] hover:underline">
                        Complete contact details
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <HoverTip label={`Open profile for ${e.firstName} ${e.lastName}`}>
                      <Link
                        href={href}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] text-[var(--nova-teal)] hover:border-[var(--nova-teal)] hover:bg-[var(--nova-teal-soft)]"
                        aria-label={`View ${e.firstName} ${e.lastName}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </HoverTip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length ? (
          <p className="px-4 py-6 text-sm text-[var(--nova-muted)]">No employees match “{q}”.</p>
        ) : null}
      </div>
      <p className="text-xs text-[var(--nova-muted)]">
        {filtered.length} of {rows.length} · {t("en", "admin.open")} a row via the view icon.
      </p>
    </div>
  );
}
