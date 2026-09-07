"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

type Field = { name: string; label: string; type?: string; required?: boolean; value?: string };

export function ApiForm({ endpoint, fields, method = "POST", multipart = false, submit = "Save" }: {
  endpoint: string; fields: Field[]; method?: "POST" | "PATCH"; multipart?: boolean; submit?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = multipart ? form : JSON.stringify(Object.fromEntries(form.entries()));
    const response = await fetch(endpoint, {
      method,
      body,
      headers: multipart ? undefined : { "Content-Type": "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(response.ok ? "Saved successfully." : result.error ?? "Request failed.");
    if (response.ok) { event.currentTarget.reset(); router.refresh(); }
  }
  return (
    <form onSubmit={send} className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => <div key={field.name}>
        <Label htmlFor={field.name}>{field.label}</Label>
        <Input id={field.name} name={field.name} type={field.type} required={field.required} defaultValue={field.value} />
      </div>)}
      <div className="flex items-end"><Button disabled={busy} type="submit">{busy ? "Working…" : submit}</Button></div>
      {message ? <p role="status" className="text-sm text-[var(--muted)] sm:col-span-2">{message}</p> : null}
    </form>
  );
}

export function PasswordForm({ mode }: { mode: "forgot" | "reset" | "change" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const fields: Field[] = mode === "forgot"
    ? [{ name: "phone", label: "Mobile number", required: true }, { name: "emailTarget", label: "Email target (personal or official)", required: true, value: "personal" }]
    : mode === "reset"
      ? [{ name: "phone", label: "Mobile number", required: true }, { name: "code", label: "6-digit code", required: true }, { name: "newPassword", label: "New password", type: "password", required: true }]
      : [{ name: "currentPassword", label: "Current password", type: "password", required: true }, { name: "newPassword", label: "New password", type: "password", required: true }];
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const endpoint = mode === "change" ? "/api/auth/change-password" : `/api/auth/forgot-password?mode=${mode === "forgot" ? "request" : "reset"}`;
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error ?? "Request failed.");
    if (mode === "forgot") router.push(`/reset-password?phone=${encodeURIComponent(String(values.phone))}`);
    else if (mode === "change") router.push("/admin/dashboard");
    else router.push("/login");
  }
  return <form onSubmit={send} className="space-y-4">
    {fields.map((field) => <div key={field.name}><Label htmlFor={field.name}>{field.label}</Label><Input {...field} id={field.name} minLength={field.type === "password" ? 10 : undefined} /></div>)}
    {message ? <p role="alert" className="text-sm text-[var(--danger)]">{message}</p> : null}
    <Button className="w-full" type="submit">{mode === "forgot" ? "Send OTP" : mode === "reset" ? "Reset password" : "Change password"}</Button>
  </form>;
}

export function VerifyDocumentForm() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    const response = await fetch(`/api/verify-document?code=${encodeURIComponent(String(code))}`);
    setResult(await response.json());
  }
  return <form onSubmit={send} className="space-y-4">
    <div><Label htmlFor="code">Verification code</Label><Input id="code" name="code" required /></div>
    <Button type="submit">Verify</Button>
    {result ? <div role="status" className="rounded-md bg-[var(--accent-soft)] p-4 text-sm">
      <strong>{result.valid ? "Document is valid" : "Document could not be verified"}</strong>
      {result.valid ? <p>{String(result.companyName)} · {String(result.period)} · Hash {String(result.hashPrefix)}</p> : null}
    </div> : null}
  </form>;
}
