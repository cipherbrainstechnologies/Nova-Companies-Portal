"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta } from "@/components/industrial";
import { t } from "@/i18n";

export default function LoginPage() {
  const locale = "en" as const;
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(locale, "login.error"));
      return;
    }
    if (data.mustChangePassword) {
      router.push("/change-password");
      return;
    }
    if (data.globalRole === "EMPLOYEE") router.push("/employee/dashboard");
    else router.push("/admin/dashboard");
  }

  return (
    <PublicChrome brand={t(locale, "brand")}>
      <div className="mx-auto max-w-md">
        <BracketLabel>AUTH / GATE</BracketLabel>
        <h1 className="h-macro mt-2 text-[clamp(2rem,6vw,3.5rem)]">
          {t(locale, "login.title")}
        </h1>
        <hr className="rule-accent mb-6 mt-3" />
        <Card>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">{t(locale, "login.phone")}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password">{t(locale, "login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="normal-case"
              />
            </div>
            {error ? (
              <p className="meta text-[var(--accent)]" role="alert">
                {'/// '} {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t(locale, "login.signingIn") : `>>> ${t(locale, "login.submit")}`}
            </Button>
          </form>
          <Meta className="mt-4 block">
            <Link href="/forgot-password">{t(locale, "login.forgot")}</Link>
          </Meta>
        </Card>
      </div>
    </PublicChrome>
  );
}
