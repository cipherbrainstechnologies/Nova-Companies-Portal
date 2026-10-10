"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

export default function ClientPeoplePage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("HR_MANAGER");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/client/${clientSlug}/people/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, portalRole: role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Invite failed");
      return;
    }
    setLink(data.acceptPath);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Team access</h2>
      <Card>
        <form className="space-y-3" onSubmit={invite}>
          <div>
            <Label>Work email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="HR_MANAGER">HR Manager</option>
              <option value="FINANCE">Finance</option>
              <option value="TEAM_MANAGER">Team Manager</option>
              <option value="READ_ONLY_AUDITOR">Read-only auditor</option>
            </select>
          </div>
          <Button type="submit">Send invitation</Button>
          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
          {link ? (
            <AlertBanner tone="success">
              Share accept link: <code className="text-xs">{link}</code>
            </AlertBanner>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
