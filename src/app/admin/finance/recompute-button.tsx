"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

/** Clears stale profit snapshots and recomputes from current statements/rules. */
export function RecomputeProfitButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/finance/profit/recompute", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Recompute failed");
      setMessage(`Recomputed ${json.months ?? 0} month(s).`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Recompute failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void onClick()}>
        {busy ? "Recomputing…" : "Recompute all profit snapshots"}
      </Button>
      {message ? <span className="text-sm text-[var(--nova-muted)]">{message}</span> : null}
    </div>
  );
}
