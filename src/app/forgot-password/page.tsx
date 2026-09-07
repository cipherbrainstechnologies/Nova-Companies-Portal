"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta } from "@/components/industrial";
import { t } from "@/i18n";

export default function ForgotPasswordPage() {
  const locale = "en" as const;
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
    setMessage(res.ok ? t(locale, "forgot.sent") : t(locale, "forgot.failed"));
  }

  return (
    <PublicChrome brand={t(locale, "brand")}>
      <div className="mx-auto max-w-md">
        <BracketLabel>AUTH / RECOVERY</BracketLabel>
        <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.5rem)]">
          {t(locale, "forgot.title")}
        </h1>
        <hr className="rule-accent mb-6 mt-3" />
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t(locale, "login.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>{t(locale, "forgot.emailTarget")}</Label>
              <Select
                value={emailTarget}
                onChange={(e) => setEmailTarget(e.target.value as "personal" | "official")}
              >
                <option value="official">{t(locale, "forgot.official")}</option>
                <option value="personal">{t(locale, "forgot.personal")}</option>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {'>>> '} {t(locale, "forgot.submit")}
            </Button>
          </form>
          {message ? <Meta className="mt-4 block text-[var(--muted)]">{message}</Meta> : null}
          <Meta className="mt-4 block">
            <Link href="/reset-password">{t(locale, "forgot.haveCode")}</Link>
          </Meta>
        </Card>
      </div>
    </PublicChrome>
  );
}
