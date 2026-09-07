"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export default function ChangePasswordPage() {
  const locale = "en" as const;
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t(locale, "common.failed"));
      return;
    }
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (me.user?.globalRole === "EMPLOYEE") router.push("/employee/dashboard");
    else router.push("/admin/dashboard");
  }

  return (
    <PublicChrome brand={t(locale, "brand")}>
      <div className="mx-auto max-w-md">
        <BracketLabel>Account security</BracketLabel>
        <h1 className="h-macro mt-3 text-[clamp(1.75rem,4vw,2.25rem)]">
          {t(locale, "change.title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
          Choose a strong password. You will be redirected to your portal after saving.
        </p>
        <Card className="mt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t(locale, "change.current")}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>{t(locale, "change.new")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
              />
            </div>
            {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
            <Button type="submit" className="w-full">
              {t(locale, "change.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </PublicChrome>
  );
}
