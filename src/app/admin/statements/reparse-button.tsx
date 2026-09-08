"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function StatementReparseButton({
  statementId,
  status,
  rowCount,
}: {
  statementId: string;
  status: string;
  rowCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsParse =
    rowCount === 0 && (status === "UPLOADED" || status === "FAILED" || status === "PARSING");

  if (!needsParse) return null;

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/statements/${statementId}/reparse`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reparse failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reparse failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void onClick()}>
        {busy ? "Parsing…" : "Parse now"}
      </Button>
      {error ? <span className="max-w-[14rem] text-right text-xs text-[var(--nova-danger)]">{error}</span> : null}
    </div>
  );
}
