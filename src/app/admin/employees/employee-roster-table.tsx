"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { StatusBadge, EmptyState, AlertBanner } from "@/components/industrial";
import { HoverTip } from "@/components/hover-tip";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

type BulkAction = "ACTIVE" | "BLOCKED" | "EXITED";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, rows: EmployeeListRow[]) {
  const header = ["name", "code", "email", "phone", "status", "company"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.displayName ?? `${r.firstName} ${r.lastName}`),
        csvEscape(r.employeeCode),
        csvEscape(r.email),
        csvEscape(r.phone),
        csvEscape(r.status),
        csvEscape(r.companyName),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function EmployeeRosterTable({
  rows,
  companyId,
  canEdit = true,
}: {
  rows: EmployeeListRow[];
  companyId?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);

  const scopedCompanyId = companyId ?? rows[0]?.companyId;

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

  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  );

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  }

  async function runBulkStatus(action: BulkAction) {
    if (!scopedCompanyId || !selected.size) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: scopedCompanyId,
          employeeIds: [...selected],
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setMessage(
        t("en", "admin.bulkStatusDone").replace("{count}", String(data.count ?? selected.size)),
      );
      setSelected(new Set());
      setPendingAction(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  function exportSelected() {
    if (!selectedRows.length) return;
    downloadCsv(`employees-${scopedCompanyId ?? "export"}.csv`, selectedRows);
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No employees in this company"
        description="Create an employee record to allocate an ID and enable the employee portal."
      />
    );
  }

  const confirmCopy =
    pendingAction === "BLOCKED"
      ? {
          title: t("en", "admin.confirmBulkDeactivate"),
          description: t("en", "admin.confirmBulkStatus").replace(
            "{count}",
            String(selected.size),
          ),
          label: t("en", "admin.bulkDeactivate"),
        }
      : pendingAction === "ACTIVE"
        ? {
            title: t("en", "admin.confirmBulkReactivate"),
            description: t("en", "admin.confirmBulkStatus").replace(
              "{count}",
              String(selected.size),
            ),
            label: t("en", "admin.bulkReactivate"),
          }
        : pendingAction === "EXITED"
          ? {
              title: t("en", "admin.confirmBulkExit"),
              description: t("en", "admin.confirmBulkStatus").replace(
                "{count}",
                String(selected.size),
              ),
              label: t("en", "admin.bulkExit"),
            }
          : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="max-w-md flex-1">
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
        {canEdit && selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[var(--nova-muted)]">
              {t("en", "admin.selectedCount").replace("{count}", String(selected.size))}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.bulkActions")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setPendingAction("BLOCKED")}
            >
              {t("en", "admin.bulkDeactivate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setPendingAction("ACTIVE")}
            >
              {t("en", "admin.bulkReactivate")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setPendingAction("EXITED")}
            >
              {t("en", "admin.bulkExit")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={exportSelected}>
              {t("en", "admin.bulkExport")}
            </Button>
          </div>
        ) : null}
      </div>

      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

      <div className="overflow-x-auto rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] shadow-[var(--nova-shadow)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--nova-border)] bg-[var(--nova-surface-muted)] text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
            <tr>
              {canEdit ? (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    aria-label={t("en", "admin.selectAll")}
                  />
                </th>
              ) : null}
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
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggleOne(e.id)}
                        aria-label={`Select ${e.firstName} ${e.lastName}`}
                      />
                    </td>
                  ) : null}
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
                      <Link
                        href={href}
                        className="mt-1 block text-xs font-semibold text-[var(--nova-teal)] hover:underline"
                      >
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

      {confirmCopy && pendingAction ? (
        <ConfirmDialog
          open
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.label}
          busy={busy}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void runBulkStatus(pendingAction)}
        />
      ) : null}
    </div>
  );
}
