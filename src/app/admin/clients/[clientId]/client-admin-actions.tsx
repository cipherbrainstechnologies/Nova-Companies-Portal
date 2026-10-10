"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

type Company = { id: string; name: string; prefix: string };

export function ClientAdminActions({
  clientId,
  companies,
  client,
}: {
  clientId: string;
  companies: Company[];
  client: {
    proposedNovaCompanyId: string | null;
    novaAgreements: { id: string; signatureEnvelopes: { id: string; status: string }[] }[];
  };
}) {
  const router = useRouter();
  const [novaCompanyId, setNovaCompanyId] = useState(client.proposedNovaCompanyId ?? companies[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      {message ? <AlertBanner tone="info">{message}</AlertBanner> : null}
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">NOVA employing entity</h3>
        <Label>Proposed company</Label>
        <select
          className="w-full rounded border border-[var(--nova-border)] px-3 py-2 text-sm"
          value={novaCompanyId}
          onChange={(e) => setNovaCompanyId(e.target.value)}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.prefix} — {c.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          onClick={async () => {
            if (await patch({ proposedNovaCompanyId: novaCompanyId })) setMessage("Entity updated");
          }}
        >
          Save entity proposal
        </Button>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">KYB review</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              const res = await fetch(`/api/admin/clients/${clientId}/kyb`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ outcome: "APPROVED", riskRating: "LOW" }),
              });
              if (res.ok) {
                setMessage("KYB approved");
                router.refresh();
              }
            }}
          >
            Approve KYB
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await fetch(`/api/admin/clients/${clientId}/kyb`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ outcome: "CHANGES_REQUESTED", notes: "Need updated registry extract" }),
              });
              router.refresh();
            }}
          >
            Request changes
          </Button>
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Agreement & pricing</h3>
        <Button
          type="button"
          onClick={async () => {
            await fetch(`/api/admin/clients/${clientId}/agreements`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                novaCompanyId,
                contractVersion: "2026.10",
              }),
            });
            await fetch(`/api/admin/clients/${clientId}/agreements`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "sign",
                envelopeId: client.novaAgreements[0]?.signatureEnvelopes[0]?.id,
                signerName: "Authorised Signatory",
                signerEmail: "signatory@client.example",
              }),
            }).catch(() => undefined);
            await fetch(`/api/admin/clients/${clientId}/pricing`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currency: "GBP", feePerEmployee: "15000.00" }),
            });
            setMessage("Agreement shell, signature, and pricing recorded — verify activation gates");
            router.refresh();
          }}
        >
          Record agreement + pricing (dev)
        </Button>
        <Button
          type="button"
          onClick={async () => {
            if (await patch({ lifecycleStatus: "ACTIVE" })) setMessage("Client activated");
          }}
        >
          Activate client
        </Button>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Assign existing employee</h3>
        <AssignEmployeeForm clientId={clientId} novaCompanyId={novaCompanyId} />
      </Card>
    </div>
  );
}

function AssignEmployeeForm({ clientId, novaCompanyId }: { clientId: string; novaCompanyId: string }) {
  const [employeeId, setEmployeeId] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Employee ID (cuid)"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        className="max-w-md"
      />
      <Button
        type="button"
        onClick={async () => {
          await fetch(`/api/admin/clients/${clientId}/assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId,
              novaCompanyId,
              effectiveFrom: new Date().toISOString(),
            }),
          });
          router.refresh();
        }}
      >
        Assign
      </Button>
    </div>
  );
}
