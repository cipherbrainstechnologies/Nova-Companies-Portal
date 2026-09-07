"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta } from "@/components/industrial";
import { t } from "@/i18n";

export default function VerifyDocumentPage() {
  const locale = "en" as const;
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/verify-document?code=${encodeURIComponent(code)}`);
    setResult(await res.json());
  }

  return (
    <PublicChrome brand={t(locale, "brand")}>
      <div className="mx-auto max-w-md">
        <BracketLabel>PUBLIC / VERIFY</BracketLabel>
        <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.5rem)]">
          {t(locale, "verify.title")}
        </h1>
        <hr className="rule-accent mb-6 mt-3" />
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t(locale, "verify.code")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              {'>>> '} {t(locale, "verify.submit")}
            </Button>
          </form>
          {result ? (
            <div className="mt-6 border-t-2 border-[var(--ink)] pt-4">
              {result.valid ? (
                <dl className="space-y-2">
                  <p className="meta text-[var(--ink)]">
                    + {t(locale, "verify.valid")}
                  </p>
                  <div>
                    <dt className="meta text-[var(--muted)]">{t(locale, "verify.company")}</dt>
                    <dd>{String(result.companyName)}</dd>
                  </div>
                  <div>
                    <dt className="meta text-[var(--muted)]">{t(locale, "verify.period")}</dt>
                    <dd>{String(result.period)}</dd>
                  </div>
                  <div>
                    <dt className="meta text-[var(--muted)]">{t(locale, "verify.issueDate")}</dt>
                    <dd>{String(result.issueDate)}</dd>
                  </div>
                  <div>
                    <dt className="meta text-[var(--muted)]">{t(locale, "verify.hashPrefix")}</dt>
                    <dd className="text-[var(--accent)]">{String(result.hashPrefix)}</dd>
                  </div>
                </dl>
              ) : (
                <Meta className="text-[var(--accent)]">{'/// '} {t(locale, "verify.invalid")}</Meta>
              )}
            </div>
          ) : null}
        </Card>
      </div>
    </PublicChrome>
  );
}
