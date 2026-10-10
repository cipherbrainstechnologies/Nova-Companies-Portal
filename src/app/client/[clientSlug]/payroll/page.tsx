"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

export default function ClientPayrollPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [state, setState] = useState<{
    approval: { status: string } | null;
    funding: { status: string } | null;
    periodYear: number;
    periodMonth: number;
  } | null>(null);
  const [message, setMessage] = useState("");

  function refresh() {
    fetch(`/api/client/${clientSlug}/payroll`).then((r) => r.json()).then(setState);
  }

  useEffect(() => {
    refresh();
  }, [clientSlug]);

  async function act(action: "submit" | "approve") {
    if (!state) return;
    const res = await fetch(`/api/client/${clientSlug}/payroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        periodYear: state.periodYear,
        periodMonth: state.periodMonth,
        payload: { attendanceConfirmed: true, notes: "Client submitted inputs" },
      }),
    });
    if (!res.ok) {
      setMessage("Action failed — check permissions or onboarding status");
      return;
    }
    setMessage(action === "submit" ? "Inputs submitted to NOVA" : "Estimate approved; funding requested");
    refresh();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Payroll</h2>
      <p className="text-sm text-[var(--nova-muted)]">
        Client approval funds commercial payroll inputs. NOVA retains statutory issue authority.
      </p>
      {message ? <AlertBanner tone="info">{message}</AlertBanner> : null}
      <Card className="space-y-3 p-4">
        <p>Period: {state?.periodMonth}/{state?.periodYear}</p>
        <p>Approval status: {state?.approval?.status ?? "NOT_STARTED"}</p>
        <p>Funding status: {state?.funding?.status ?? "—"}</p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => act("submit")}>Submit inputs</Button>
          <Button type="button" variant="secondary" onClick={() => act("approve")}>
            Approve estimate (Finance)
          </Button>
        </div>
      </Card>
    </div>
  );
}
