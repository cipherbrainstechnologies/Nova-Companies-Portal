"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel } from "@/components/industrial";
import { t } from "@/i18n";

export default function ResetPasswordPage() {
  const locale = "en" as const;
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/forgot-password?mode=reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t(locale, "common.failed"));
      return;
    }
    router.push("/login");
  }

  return (
    <PublicChrome brand={t(locale, "brand")}>
      <div className="mx-auto max-w-md">
        <BracketLabel>AUTH / OTP</BracketLabel>
        <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.5rem)]">
          {t(locale, "reset.title")}
        </h1>
        <hr className="rule-accent mb-6 mt-3" />
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t(locale, "login.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label>{t(locale, "reset.code")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
            </div>
            <div>
              <Label>{t(locale, "reset.newPassword")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
                className="normal-case"
              />
            </div>
            {error ? <p className="meta text-[var(--accent)]">{'/// '} {error}</p> : null}
            <Button type="submit" className="w-full">
              {'>>> '} {t(locale, "reset.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </PublicChrome>
  );
}
