"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

type LegalDoc = {
  id: string;
  templateCode: string;
  templateVersion: number;
  status: string;
  missingVariables: unknown;
  template: { status: string; name: string };
  sha256: string | null;
  signatoryName: string | null;
};

export function OnboardingWorkspace({
  clientId,
  status,
  reference,
  owner,
  documents,
  blockers,
  planNote,
}: {
  clientId: string;
  status: string;
  reference: string;
  owner: string;
  documents: LegalDoc[];
  blockers: string[];
  planNote: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryEmail, setSignatoryEmail] = useState("");
  const [signedAt, setSignedAt] = useState("");

  const missing = documents.flatMap((doc) =>
    Array.isArray(doc.missingVariables) ? (doc.missingVariables as string[]).map((item) => `${doc.templateCode}: ${item}`) : [],
  );
  const next = blockers[0] ?? (missing[0] ? "Complete missing contractual information" : "Review the document pack");

  async function post(url: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    router.refresh();
  }

  async function recordExecuted(documentId: string, file: File | null) {
    if (!file) {
      setError("Choose the signed PDF");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    await post(`/api/admin/clients/${clientId}/legal-documents/${documentId}`, {
      action: "execute",
      signatoryName,
      signatoryEmail,
      signedAt,
      executedPdfBase64: btoa(binary),
      executedFileName: file.name,
    });
  }

  return (
    <div className="space-y-4">
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">Overview</h3>
        <p className="text-sm">Reference {reference}</p>
        <p className="text-sm">Status {status}</p>
        <p className="text-sm">Nova owner {owner}</p>
        <p className="text-sm">Next action: {next}</p>
        {missing.length ? (
          <ul className="list-disc pl-5 text-sm">
            {missing.map((item) => (
              <li key={item}>Awaiting Information — {item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">No missing contractual variables on the current drafts.</p>
        )}
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Documents</h3>
        <p className="text-sm text-[var(--nova-muted)]">
          Drafts use the current template version. An executed copy is stored separately and is not regenerated.
          No e-sign provider is configured, so execution is a verified signed-copy upload.
        </p>
        {documents.map((doc) => (
          <div key={doc.id} className="border-t border-[var(--nova-border)] py-3 text-sm">
            <p className="font-medium">{doc.template.name} · v{doc.templateVersion}</p>
            <p>Status: {doc.status} · Template: {doc.template.status}</p>
            {doc.sha256 ? <p className="break-all text-xs">Checksum {doc.sha256}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="underline" href={`/api/admin/clients/${clientId}/legal-documents/${doc.id}`}>Download</a>
              {doc.status !== "FULLY_EXECUTED" ? (
                <Button type="button" onClick={() => post(`/api/admin/clients/${clientId}/legal-documents`, { regenerate: true, code: doc.templateCode })}>
                  Regenerate draft
                </Button>
              ) : null}
              <Button type="button" onClick={() => post(`/api/admin/clients/${clientId}/legal-documents/${doc.id}`, { action: "review" })}>Internal review</Button>
              <Button type="button" onClick={() => post(`/api/admin/clients/${clientId}/legal-documents/${doc.id}`, { action: "approve_signature" })}>Approve for signature</Button>
              <Button type="button" onClick={() => post(`/api/admin/clients/${clientId}/legal-documents/${doc.id}`, { action: "send" })}>Send for signature</Button>
            </div>
            {doc.status === "SENT_FOR_SIGNATURE" || doc.status === "PARTIALLY_SIGNED" || doc.status === "APPROVED_FOR_SIGNATURE" ? (
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                <div><Label>Signatory</Label><Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} /></div>
                <div><Label>Email</Label><Input value={signatoryEmail} onChange={(e) => setSignatoryEmail(e.target.value)} /></div>
                <div><Label>Signed at</Label><Input type="datetime-local" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} /></div>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const file = new FormData(event.currentTarget).get("file");
                    void recordExecuted(doc.id, file instanceof File ? file : null);
                  }}
                >
                  <input name="file" type="file" accept="application/pdf" />
                  <Button type="submit">Record verified executed copy</Button>
                </form>
              </div>
            ) : null}
          </div>
        ))}
        <Button type="button" onClick={() => post(`/api/admin/clients/${clientId}/legal-documents`, { regenerate: true, code: "AMENDMENT" })}>
          Prepare amendment
        </Button>
      </Card>
      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">Commercial</h3>
        <p className="text-sm">{planNote}</p>
        <p className="text-sm">A proposed fee is not a billable pricing agreement. Approve pricing with the existing pricing action.</p>
      </Card>
      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">Activation</h3>
        {blockers.length ? (
          <ul className="list-disc pl-5 text-sm">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Activation checks passed. Activating sends one invitation to the authorised representative. No password is emailed.</p>
        )}
      </Card>
    </div>
  );
}
