"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PublicChrome } from "@/components/industrial";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/client/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, displayName, phone, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to accept invitation");
      return;
    }
    if (data.alreadyAccepted) {
      router.push("/login/client");
      return;
    }
    router.push(`/client/${data.clientSlug}/overview`);
  }

  return (
    <PublicChrome brand="NOVA">
      <div className="mx-auto max-w-md py-8">
        <h1 className="text-2xl font-bold">Accept invitation</h1>
        <Card className="mt-4">
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <Label>Your name</Label>
              <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
            <Button type="submit" disabled={loading || !token} className="w-full">
              {loading ? "Creating account…" : "Join workspace"}
            </Button>
          </form>
        </Card>
      </div>
    </PublicChrome>
  );
}
