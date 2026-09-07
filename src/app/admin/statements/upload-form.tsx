"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { t } from "@/i18n";

export function StatementUploadForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    const body = new FormData();
    body.set("companyId", companyId);
    body.set("file", file);
    const res = await fetch("/api/statements", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Label>{t("en", "admin.statementFile")}</Label>
          <Input
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="normal-case"
          />
        </div>
        <Button type="submit">&gt;&gt;&gt; {t("en", "admin.uploadStatement")}</Button>
      </form>
      {error ? <p className="meta mt-2 text-[var(--accent)]">{'/// '} {error}</p> : null}
    </Card>
  );
}
