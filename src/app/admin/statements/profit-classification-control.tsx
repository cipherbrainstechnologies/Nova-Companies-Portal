"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui";
import { Meta } from "@/components/industrial";

const CLASSIFICATIONS = [
  "UNCLASSIFIED",
  "REVENUE",
  "SALARY",
  "OVERTIME",
  "TAX",
  "EXPENSE",
  "LOAN_EMI",
  "CREDIT_CARD",
  "OWNER_TRANSFER",
  "CASH_WITHDRAWAL",
  "REIMBURSEMENT",
  "PF_ESI",
  "CONTRACTOR",
  "IGNORE",
] as const;

/**
 * Manual profit / statement classification. Overrides narration rules and is audit-logged.
 */
export function ProfitClassificationControl({
  transactionId,
  initialClassification,
}: {
  transactionId: string;
  initialClassification: string;
}) {
  const [value, setValue] = useState(initialClassification);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function onChange(next: string) {
    setValue(next);
    setStatus("saving");
    try {
      const res = await fetch(`/api/statements/transactions/${transactionId}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classification: next,
          notes: "Manual classification from reconciliation UI",
        }),
      });
      if (!res.ok) throw new Error("classify failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-3">
      <Label>Profit classification</Label>
      <Select value={value} onChange={(e) => void onChange(e.target.value)}>
        {CLASSIFICATIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Meta className="mt-1">
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved · overrides narration rules"
            : status === "error"
              ? "Save failed"
              : "Manual override is audit-logged"}
      </Meta>
    </div>
  );
}
