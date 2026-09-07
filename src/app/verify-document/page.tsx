"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { t } from "@/i18n";

export default function VerifyDocumentPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/verify-document?code=${encodeURIComponent(code)}`);
    setResult(await res.json());
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card>
        <h1 className="h-display mb-4 text-2xl font-bold">{t("en", "verify.title")}</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>{t("en", "verify.code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full">
            {t("en", "verify.submit")}
          </Button>
        </form>
        {result ? (
          <div className="mt-4 text-sm">
            {result.valid ? (
              <div>
                <p className="font-semibold text-[var(--accent)]">{t("en", "verify.valid")}</p>
                <p>Company: {String(result.companyName)}</p>
                <p>Period: {String(result.period)}</p>
                <p>Issue date: {String(result.issueDate)}</p>
                <p>Hash prefix: {String(result.hashPrefix)}</p>
              </div>
            ) : (
              <p className="text-[var(--danger)]">{t("en", "verify.invalid")}</p>
            )}
          </div>
        ) : null}
      </Card>
    </main>
  );
}
