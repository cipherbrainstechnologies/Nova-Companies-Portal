"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner, BracketLabel } from "@/components/industrial";
import { deriveExpectedMonthlyNet } from "@/server/payroll/salary-structure";
import { t } from "@/i18n";

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function CreateEmployeeForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    primaryPhone: "",
    officialEmail: "",
    temporaryPassword: "",
    designation: "",
  });
  const [structure, setStructure] = useState({
    annualCtc: "",
    monthlyGross: "",
    monthlyTds: "",
    monthlyPt: "",
    accountHolderName: "",
  });

  const expectedNet = deriveExpectedMonthlyNet({
    annualCtc: toNumber(structure.annualCtc),
    monthlyGross: toNumber(structure.monthlyGross),
    monthlyTds: toNumber(structure.monthlyTds),
    monthlyPt: toNumber(structure.monthlyPt),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));

      const hasStructure =
        toNumber(structure.annualCtc) != null ||
        toNumber(structure.monthlyGross) != null ||
        structure.accountHolderName.trim().length > 0;
      if (hasStructure && data.id) {
        const structureRes = await fetch(`/api/employees/${data.id}/salary-structure`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            annualCtc: toNumber(structure.annualCtc),
            monthlyGross: toNumber(structure.monthlyGross),
            monthlyTds: toNumber(structure.monthlyTds),
            monthlyPt: toNumber(structure.monthlyPt),
            accountHolderName: structure.accountHolderName.trim() || null,
          }),
        });
        if (!structureRes.ok) {
          const structureData = await structureRes.json();
          throw new Error(
            structureData.error ?? "Employee created, but the salary structure could not be saved",
          );
        }
      }

      setForm({
        firstName: "",
        lastName: "",
        primaryPhone: "",
        officialEmail: "",
        temporaryPassword: "",
        designation: "",
      });
      setStructure({
        annualCtc: "",
        monthlyGross: "",
        monthlyTds: "",
        monthlyPt: "",
        accountHolderName: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    ["firstName", "admin.firstName", false],
    ["lastName", "admin.lastName", false],
    ["primaryPhone", "admin.primaryPhone", false],
    ["officialEmail", "admin.officialEmail", false],
    ["designation", "admin.designation", false],
    ["temporaryPassword", "admin.tempPassword", true],
  ] as const;

  const structureFields = [
    ["annualCtc", "Annual CTC"],
    ["monthlyGross", "Monthly gross"],
    ["monthlyTds", "Monthly TDS"],
    ["monthlyPt", "Monthly professional tax"],
  ] as const;

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map(([key, labelKey, isPassword]) => (
            <div key={key}>
              <Label>{t("en", labelKey)}</Label>
              <Input
                type={isPassword ? "password" : "text"}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={key !== "designation"}
              />
            </div>
          ))}
        </div>

        <div className="rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface-muted)] p-4">
          <BracketLabel>Salary structure (optional)</BracketLabel>
          <p className="mt-2 text-xs text-[var(--nova-muted)]">
            Recording the expected monthly net now lets bank reconciliation match this employee
            automatically. You can add or change it later from the employee page.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {structureFields.map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  inputMode="decimal"
                  value={structure[key]}
                  onChange={(e) => setStructure((s) => ({ ...s, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <Label>Bank account holder name</Label>
              <Input
                value={structure.accountHolderName}
                onChange={(e) =>
                  setStructure((s) => ({ ...s, accountHolderName: e.target.value }))
                }
                placeholder="As printed on the bank statement"
              />
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-[var(--nova-text-secondary)]">
            Expected monthly net:{" "}
            {expectedNet != null ? expectedNet.toLocaleString("en-IN") : "not enough detail yet"}
          </p>
        </div>

        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : t("en", "admin.createEmployee")}
        </Button>
      </form>
      {error ? (
        <div className="mt-3">
          <AlertBanner tone="danger">{error}</AlertBanner>
        </div>
      ) : null}
    </Card>
  );
}
