"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { PublicChrome, BracketLabel, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export default function ForgotPasswordPage() {
  const locale = "en" as const;
  const [phone, setPhone] = useState("");
  const [emailTarget, setEmailTarget] = useState<"personal" | "official">("official");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/forgot-password?mode=request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, emailTarget }),
    });
    setOk(res.ok);
    setMessage(res.ok ? t(locale, "forgot.sent") : t(locale, "forgot.failed"));
  }

  return (
    <PublicChrome brand={t(locale, "brand")}>
      <div className="mx-auto max-w-md">
        <BracketLabel>Password recovery</BracketLabel>
        <h1 className="h-macro mt-3 text-[clamp(1.75rem,4vw,2.25rem)]">
          {t(locale, "forgot.title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
          Enter your registered phone. We send a one-time code to your selected recovery email.
        </p>
        <Card className="mt-6">
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
              {t(locale, "forgot.submit")}
            </Button>
          </form>
          {message ? (
            <div className="mt-4">
              <AlertBanner tone={ok ? "success" : "danger"}>{message}</AlertBanner>
            </div>
          ) : null}
          <p className="mt-4 text-sm">
            <Link href="/reset-password" className="font-semibold text-[var(--nova-teal)]">
              {t(locale, "forgot.haveCode")}
            </Link>
          </p>
        </Card>
      </div>
    </PublicChrome>
  );
}
