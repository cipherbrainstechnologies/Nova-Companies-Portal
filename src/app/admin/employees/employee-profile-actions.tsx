"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Modal } from "@/components/modal";
import { Input, Label } from "@/components/ui";

export function EmployeeProfileActions({
  companyId,
  employeeId,
  employeeCode,
  status,
  canEdit,
}: {
  companyId: string;
  employeeId: string;
  employeeCode: string;
  status: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"deactivate" | "activate" | "exit" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");

  async function setStatus(next: "ACTIVE" | "BLOCKED" | "EXITED") {
    setBusy(next === "ACTIVE" ? "activate" : next === "BLOCKED" ? "deactivate" : "exit");
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/employees/${employeeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Status update failed");
      setMessage(
        next === "ACTIVE"
          ? "Profile reactivated."
          : next === "BLOCKED"
            ? "Profile deactivated. Login is blocked."
            : "Employee marked as exited.",
      );
      setConfirmDeactivate(false);
      setConfirmExit(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status update failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteProfile() {
    setBusy("delete");
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push(`/admin/companies/${companyId}/employees`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed");
      setBusy(null);
    }
  }

  if (!canEdit) return null;

  const inactive = status === "BLOCKED" || status === "EXITED";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {inactive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!busy}
            onClick={() => void setStatus("ACTIVE")}
          >
            {busy === "activate" ? "Reactivating…" : "Reactivate profile"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!busy}
            onClick={() => setConfirmDeactivate(true)}
          >
            Deactivate profile
          </Button>
        )}
        {status !== "EXITED" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!!busy}
            onClick={() => setConfirmExit(true)}
          >
            Mark as exited
          </Button>
        ) : null}
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={!!busy}
          onClick={() => {
            setConfirmCode("");
            setDeleteOpen(true);
          }}
        >
          Delete profile
        </Button>
      </div>
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this profile?"
        description="The employee cannot sign in while deactivated. Historical payslips and salary structures are kept. You can reactivate later."
        confirmLabel="Deactivate"
        busy={busy === "deactivate"}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => void setStatus("BLOCKED")}
      />
      <ConfirmDialog
        open={confirmExit}
        title="Mark employee as exited?"
        description="Exited employees stay in historical payroll but are treated as left the company. Issued payslips are preserved."
        confirmLabel="Mark exited"
        busy={busy === "exit"}
        onCancel={() => setConfirmExit(false)}
        onConfirm={() => void setStatus("EXITED")}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete employee profile"
        description={`Permanent delete for ${employeeCode}. Issued payslips block deletion — deactivate instead.`}
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--nova-text-secondary)]">
            Type the employee code <strong>{employeeCode}</strong> to confirm. This cannot be undone.
          </p>
          <div>
            <Label htmlFor="confirmDeleteCode">Employee code</Label>
            <Input
              id="confirmDeleteCode"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              placeholder={employeeCode}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={busy === "delete" || confirmCode.trim().toUpperCase() !== employeeCode.toUpperCase()}
              onClick={() => void deleteProfile()}
            >
              {busy === "delete" ? "Deleting…" : "Delete permanently"}
            </Button>
            <Button type="button" variant="ghost" disabled={!!busy} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
          </div>
          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        </div>
      </Modal>
    </div>
  );
}
