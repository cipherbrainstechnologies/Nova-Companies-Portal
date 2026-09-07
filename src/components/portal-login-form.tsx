"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, AlertBanner } from "@/components/industrial";
import { t } from "@/i18n";

export function PortalLoginForm({
  portal,
}: {
  portal: "admin" | "employee";
}) {
  const locale = "en" as const;
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = portal === "admin";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal, identifier, password }),
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
    router.push(isAdmin ? "/admin/dashboard" : "/employee/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <BracketLabel>{isAdmin ? "Admin sign-in" : "Employee sign-in"}</BracketLabel>
      <h1 className="h-macro mt-3 text-[clamp(1.75rem,5vw,2.25rem)]">
        {isAdmin ? t(locale, "login.adminTitle") : t(locale, "login.employeeTitle")}
      </h1>
      <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
        {isAdmin ? t(locale, "login.adminHint") : t(locale, "login.employeeHint")}
      </p>
      <Card className="mt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="identifier">
              {isAdmin ? t(locale, "login.adminId") : t(locale, "login.employeeId")}
            </Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              placeholder={isAdmin ? "you@company.com" : "NW-0020 or +91…"}
            />
          </div>
          <div>
            <Label htmlFor="password">{t(locale, "login.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-20"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-[var(--nova-muted)] hover:text-[var(--nova-teal)]"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading
              ? t(locale, "login.signingIn")
              : isAdmin
                ? t(locale, "login.adminSubmit")
                : t(locale, "login.employeeSubmit")}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link
            href={isAdmin ? "/login/employee" : "/login/admin"}
            className="font-medium text-[var(--nova-text-secondary)] hover:text-[var(--nova-teal)]"
          >
            {isAdmin ? t(locale, "login.switchEmployee") : t(locale, "login.switchAdmin")}
          </Link>
          <Link href="/forgot-password" className="font-medium text-[var(--nova-teal)]">
            {t(locale, "login.forgot")}
          </Link>
        </div>
      </Card>
      <p className="meta mt-4">
        {isAdmin ? t(locale, "login.demoAdmin") : t(locale, "login.demoEmployee")}
      </p>
    </div>
  );
}

export default function LoginChooserPage() {
  const locale = "en" as const;
  return (
    <PublicChrome brand={t(locale, "brand")}>
      <BracketLabel>Choose your portal</BracketLabel>
      <h1 className="h-macro mt-3 text-[clamp(1.85rem,5vw,2.75rem)]">
        {t(locale, "login.chooserTitle")}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--nova-text-secondary)]">
        {t(locale, "login.chooserBody")}
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/login/admin"
          className="group rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 shadow-[var(--nova-shadow)] transition hover:border-[var(--nova-teal)] hover:shadow-[var(--nova-shadow-md)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--nova-teal)]">
            Operations
          </p>
          <div className="mt-2 text-xl font-bold text-[var(--nova-ink)]">
            {t(locale, "login.adminTitle")}
          </div>
          <p className="mt-2 text-sm text-[var(--nova-muted)]">{t(locale, "login.adminHint")}</p>
          <div className="mt-5 text-sm font-semibold text-[var(--nova-teal)] group-hover:underline">
            {t(locale, "nav.login")} →
          </div>
        </Link>
        <Link
          href="/login/employee"
          className="group rounded-[var(--nova-radius-lg)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-6 shadow-[var(--nova-shadow)] transition hover:border-[var(--nova-teal)] hover:shadow-[var(--nova-shadow-md)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--nova-teal)]">
            Self-service
          </p>
          <div className="mt-2 text-xl font-bold text-[var(--nova-ink)]">
            {t(locale, "login.employeeTitle")}
          </div>
          <p className="mt-2 text-sm text-[var(--nova-muted)]">{t(locale, "login.employeeHint")}</p>
          <div className="mt-5 text-sm font-semibold text-[var(--nova-teal)] group-hover:underline">
            {t(locale, "nav.login")} →
          </div>
        </Link>
      </div>
    </PublicChrome>
  );
}
