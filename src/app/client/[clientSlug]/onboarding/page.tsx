"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

type OnboardingPayload = {
  client: { lifecycleStatus: string; legalName: string };
  case: {
    kybDocuments: Array<{ id: string; category: string; status: string }>;
    complianceReviews: Array<{ outcome: string; createdAt: string }>;
  } | null;
};

export default function ClientOnboardingPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [data, setData] = useState<OnboardingPayload | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/client/${clientSlug}/onboarding`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Unable to load onboarding"));
  }, [clientSlug]);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const form = new FormData();
    form.set("category", "LEGAL_IDENTITY");
    form.set("file", file);
    const res = await fetch(`/api/client/${clientSlug}/onboarding/kyb`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Upload failed");
      return;
    }
    const refreshed = await fetch(`/api/client/${clientSlug}/onboarding`).then((r) => r.json());
    setData(refreshed);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Onboarding</h2>
      {data ? (
        <p className="text-sm text-[var(--nova-muted)]">
          Status: {data.client.lifecycleStatus.replace(/_/g, " ")}
        </p>
      ) : null}
      <Card className="space-y-4 p-4">
        <Label>KYB document (PDF or image, max 15MB)</Label>
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        {uploading ? <p className="text-sm">Uploading…</p> : null}
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        <ul className="text-sm">
          {data?.case?.kybDocuments.map((d) => (
            <li key={d.id}>{d.category}: {d.status}</li>
          ))}
        </ul>
        <Button type="button" disabled>
          Submit for NOVA review (after required documents uploaded)
        </Button>
      </Card>
    </div>
  );
}
