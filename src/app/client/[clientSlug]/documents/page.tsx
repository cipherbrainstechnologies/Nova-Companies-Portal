"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

export default function ClientDocumentsPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [agreements, setAgreements] = useState<
    Array<{ id: string; contractVersion: string; signatureEnvelopes: Array<{ status: string }> }>
  >([]);

  useEffect(() => {
    fetch(`/api/client/${clientSlug}/documents`)
      .then((r) => r.json())
      .then((d) => setAgreements(d.agreements ?? []));
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
        {!agreements.length ? <p className="text-sm text-[var(--nova-muted)]">No agreements on file yet.</p> : null}
      </Card>
    </div>
  );
}
