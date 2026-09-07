"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

function VerifyForm() {
  const locale = "en" as const;
  const search = useSearchParams();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const q = search.get("code");
    if (q) setCode(q);
  }, [search]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/verify-document?code=${encodeURIComponent(code)}`);
    setResult(await res.json());
  }

  return (
    <div className="mx-auto max-w-md">
      <BracketLabel>Document verification</BracketLabel>
      <h1 className="h-macro mt-3 text-[clamp(1.75rem,4vw,2.25rem)]">
        {t(locale, "verify.title")}
      </h1>
      <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
        Confirm a payslip is authentic. Salary and bank details are never shown here.
      </p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>{t(locale, "verify.code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full">
            {t(locale, "verify.submit")}
          </Button>
        </form>
        {result ? (
          <div className="mt-6 border-t border-[var(--nova-border)] pt-4">
            {result.valid ? (
              <div className="space-y-3">
                <AlertBanner tone="success">{t(locale, "verify.valid")}</AlertBanner>
                <dl className="grid gap-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                      {t(locale, "verify.company")}
                    </dt>
                    <dd className="text-sm font-medium">{String(result.companyName)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                      {t(locale, "verify.period")}
                    </dt>
                    <dd className="text-sm font-medium">{String(result.period)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                      {t(locale, "verify.issueDate")}
                    </dt>
                    <dd className="text-sm font-medium">{String(result.issueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
                      {t(locale, "verify.hashPrefix")}
                    </dt>
                    <dd className="font-mono text-sm text-[var(--nova-teal)]">
                      {String(result.hashPrefix)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <AlertBanner tone="danger">{t(locale, "verify.invalid")}</AlertBanner>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default function VerifyDocumentPage() {
  return (
    <PublicChrome brand={t("en", "brand")}>
      <Suspense fallback={<div className="skeleton mx-auto h-64 max-w-md" />}>
        <VerifyForm />
      </Suspense>
    </PublicChrome>
  );
}
