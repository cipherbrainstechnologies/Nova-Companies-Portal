"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

export function CreateClientForm() {
  const router = useRouter();
  const [legalName, setLegalName] = useState("");
  const [countryCode, setCountryCode] = useState("GB");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legalName, countryCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    router.push(`/admin/clients/${data.client.id}`);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <Label>Legal name</Label>
          <Input required value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>
        <div className="w-24">
          <Label>Country</Label>
          <Input required maxLength={2} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create prospect"}</Button>
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      </form>
    </Card>
  );
}
