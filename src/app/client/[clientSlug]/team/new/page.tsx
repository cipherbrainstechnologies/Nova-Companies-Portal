"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

export default function ClientHireRequestPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    workState: "",
    proposedGrossInr: "",
    startDate: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/client/${clientSlug}/hire-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          jobTitle: form.jobTitle,
          workState: form.workState,
          proposedStartDate: form.startDate,
        },
        provisionalCost: {
          monthlyGrossInr: form.proposedGrossInr,
          assumptions: ["Provisional employer statutory at 13% illustrative rate"],
        },
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to submit");
      return;
    }
    router.push(`/client/${clientSlug}/team`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h2 className="text-2xl font-bold">New hire request</h2>
      <p className="text-sm text-[var(--nova-muted)]">
        NOVA reviews statutory eligibility before any offer is sent. Costs shown are provisional.
      </p>
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>First name</Label>
              <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Job title</Label>
            <Input required value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </div>
          <div>
            <Label>Work location (state)</Label>
            <Input required value={form.workState} onChange={(e) => setForm({ ...form, workState: e.target.value })} />
          </div>
          <div>
            <Label>Proposed monthly gross (INR)</Label>
            <Input required value={form.proposedGrossInr} onChange={(e) => setForm({ ...form, proposedGrossInr: e.target.value })} />
          </div>
          <div>
            <Label>Proposed start date</Label>
            <Input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting…" : "Submit to NOVA"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
