"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export default function ResetPasswordPage() {
  const locale = "en" as const;
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <BracketLabel>Set new password</BracketLabel>
        <h1 className="h-macro mt-3 text-[clamp(1.75rem,4vw,2.25rem)]">
          {t(locale, "reset.title")}
        </h1>
        <Card className="mt-6">
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
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={10}
                  className="pr-20"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--nova-muted)]"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
            <Button type="submit" className="w-full">
              {t(locale, "reset.submit")}
            </Button>
          </form>
          <p className="mt-4 text-sm">
            <Link href="/login" className="font-semibold text-[var(--nova-teal)]">
              Back to login
            </Link>
          </p>
        </Card>
      </div>
    </PublicChrome>
  );
}
