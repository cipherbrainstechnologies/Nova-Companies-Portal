"use client";

import { useState } from "react";
import type { SiteCopy } from "@/content/public-site";
import { Button, Input, Label } from "@/components/ui";

type FormCopy = SiteCopy["contact"]["form"];

export function ContactForm({ copy }: { copy: FormCopy }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error" | "invalid">("idle");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setErrors({});
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      form.reset();
      setStatus("success");
      return;
    }
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { fields?: string[] } | null;
      const fields = body?.fields ?? [];
      const next: Record<string, boolean> = {};
      for (const field of fields) next[field] = true;
      setErrors(next);
      setStatus("invalid");
      const first = fields.find(Boolean);
      if (first) form.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
      return;
    }
    setStatus("error");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div hidden>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      </div>
      <Field label={copy.name} name="name" required invalid={errors.name} />
      <Field label={copy.email} name="email" type="email" required autoComplete="email" invalid={errors.email} />
      <Field label={copy.organisation} name="organisation" hint={copy.optional} autoComplete="organization" />
      <Field label={copy.phone} name="phone" type="tel" hint={copy.optional} autoComplete="tel" invalid={errors.phone} />
      <div>
        <Label htmlFor="topic">{copy.topic}</Label>
        <select
          id="topic"
          name="topic"
          required
          aria-invalid={errors.topic || undefined}
          className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm"
          defaultValue="eor"
        >
          {copy.topics.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="message">{copy.message}</Label>
        <textarea
          id="message"
          name="message"
          required
          minLength={20}
          rows={6}
          aria-invalid={errors.message || undefined}
          placeholder={copy.messageHint}
          className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 text-sm"
        />
      </div>
      <Button type="submit" size="lg" disabled={status === "sending"}>
        {status === "sending" ? copy.sending : copy.submit}
      </Button>
      {status === "success" ? (
        <p role="status" className="text-sm font-medium text-[var(--nova-success)]">
          {copy.success}
        </p>
      ) : null}
      {status === "invalid" ? (
        <p role="alert" className="text-sm font-medium text-[var(--nova-danger)]">
          {copy.invalid}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm font-medium text-[var(--nova-danger)]">
          {copy.error}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  hint,
  autoComplete,
  invalid,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  autoComplete?: string;
  invalid?: boolean;
}) {
  const id = name;
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {hint ? <span className="ml-2 font-normal text-[var(--nova-muted)]">{hint}</span> : null}
      </Label>
      <Input id={id} name={name} type={type} required={required} autoComplete={autoComplete} aria-invalid={invalid || undefined} />
    </div>
  );
}
