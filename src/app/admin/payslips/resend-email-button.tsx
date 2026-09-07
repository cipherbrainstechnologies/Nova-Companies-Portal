"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { t } from "@/i18n";

export function ResendEmailButton({ payslipId }: { payslipId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function resend() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(`/api/payslips/${payslipId}/resend-email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setStatus(`Queued for ${data.queued} address(es)`);
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void resend()}>
        {busy ? "Queueing…" : "Resend email"}
      </Button>
      {status ? <span className="text-xs text-[var(--nova-muted)]">{status}</span> : null}
    </div>
  );
}
