"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [emailTarget, setEmailTarget] = useState<"personal" | "official">("official");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/forgot-password?mode=request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, emailTarget }),
    });
    setMessage(res.ok ? "If the account exists, an OTP was sent." : "Request failed");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card>
        <h1 className="h-display mb-4 text-2xl font-bold">Reset password</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Mobile number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <Label>Send OTP to</Label>
            <select
              className="w-full rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm"
              value={emailTarget}
              onChange={(e) => setEmailTarget(e.target.value as "personal" | "official")}
            >
              <option value="official">Official email</option>
              <option value="personal">Personal email</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            Send OTP
          </Button>
        </form>
        {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
        <p className="mt-4 text-sm">
          <Link href="/reset-password">I have a code</Link>
        </p>
      </Card>
    </main>
  );
}
