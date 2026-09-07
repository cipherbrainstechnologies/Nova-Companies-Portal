"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel } from "@/components/industrial";
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
        <BracketLabel>AUTH / ROTATE</BracketLabel>
        <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.5rem)]">
          {t(locale, "change.title")}
        </h1>
        <hr className="rule-accent mb-6 mt-3" />
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>{t(locale, "change.current")}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="normal-case"
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
                className="normal-case"
              />
            </div>
            {error ? <p className="meta text-[var(--accent)]">{'/// '} {error}</p> : null}
            <Button type="submit" className="w-full">
              {'>>> '} {t(locale, "change.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </PublicChrome>
  );
}
