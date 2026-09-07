"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card } from "@/components/ui";
import { t } from "@/i18n";

type Field = { name: string; label: string; type?: string; required?: boolean; value?: string };

export function ApiForm({
  endpoint,
  fields,
  method = "POST",
  multipart = false,
  submit,
}: {
  endpoint: string;
  fields: Field[];
  method?: "POST" | "PATCH";
  multipart?: boolean;
  submit?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = multipart ? form : JSON.stringify(Object.fromEntries(form.entries()));
    const response = await fetch(endpoint, {
      method,
      body,
      headers: multipart ? undefined : { "Content-Type": "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(
      response.ok ? "Saved successfully." : (result as { error?: string }).error ?? t("en", "common.failed"),
    );
    if (response.ok) {
      event.currentTarget.reset();
      router.refresh();
    }
  }
  return (
    <Card>
      <form onSubmit={send} className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              required={field.required}
              defaultValue={field.value}
            />
          </div>
        ))}
        <div className="flex items-end">
          <Button disabled={busy} type="submit">
            {'>>> '} {busy ? t("en", "common.loading") : submit ?? t("en", "common.save")}
          </Button>
        </div>
        {message ? (
          <p role="status" className="meta text-[var(--muted)] sm:col-span-2">
            {message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
