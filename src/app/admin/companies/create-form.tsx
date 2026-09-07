"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, prefix }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    router.refresh();
    setName("");
    setPrefix("");
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>{t("en", "admin.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>{t("en", "admin.prefix")}</Label>
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} required maxLength={4} />
        </div>
        <div className="flex items-end">
          <Button type="submit">{t("en", "admin.create")}</Button>
        </div>
      </form>
      {error ? (
        <div className="mt-3">
          <AlertBanner tone="danger">{error}</AlertBanner>
        </div>
      ) : null}
    </Card>
  );
}
