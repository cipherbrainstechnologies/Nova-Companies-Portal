"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

export default function ClientDocumentsPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [agreements, setAgreements] = useState<
    Array<{ id: string; contractVersion: string; signatureEnvelopes: Array<{ status: string }> }>
  >([]);
  const [legalDocuments, setLegalDocuments] = useState<
    Array<{ id: string; templateCode: string; templateVersion: number; signatoryName: string | null; downloadUrl: string | null }>
  >([]);

  useEffect(() => {
    fetch(`/api/client/${clientSlug}/documents`)
      .then((r) => r.json())
      .then((d) => {
        setAgreements(d.agreements ?? []);
        setLegalDocuments(d.legalDocuments ?? []);
      });
  }, [clientSlug]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Documents</h2>
      <Card className="space-y-3 p-4">
        {agreements.map((a) => (
          <div key={a.id} className="border-b border-[var(--nova-border)] pb-3">
            <p className="font-medium">MSA / EOR schedule v{a.contractVersion}</p>
            <p className="text-sm text-[var(--nova-muted)]">
              Signature: {a.signatureEnvelopes[0]?.status ?? "PENDING"}
            </p>
          </div>
        ))}
        {legalDocuments.map((doc) => (
          <div key={doc.id} className="border-b border-[var(--nova-border)] pb-3">
            <p className="font-medium">
              {doc.templateCode} v{doc.templateVersion}
            </p>
            <p className="text-sm text-[var(--nova-muted)]">Executed{doc.signatoryName ? ` · ${doc.signatoryName}` : ""}</p>
            {doc.downloadUrl ? (
              <a href={doc.downloadUrl} className="text-sm font-medium text-[#5857f5]">
                Download executed copy
              </a>
            ) : null}
          </div>
        ))}
        {!agreements.length && !legalDocuments.length ? (
          <p className="text-sm text-[var(--nova-muted)]">No executed agreements on file yet.</p>
        ) : null}
      </Card>
    </div>
  );
}
