"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { PublicChrome, BracketLabel, Meta } from "@/components/industrial";
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
    <div className="mx-auto w-full max-w-md px-1">
      <BracketLabel>{isAdmin ? "ADMIN / GATE" : "EMPLOYEE / GATE"}</BracketLabel>
      <h1 className="h-macro mt-2 text-[clamp(2rem,7vw,3.25rem)]">
        {isAdmin ? t(locale, "login.adminTitle") : t(locale, "login.employeeTitle")}
      </h1>
      <p className="meta mt-3 normal-case tracking-[0.04em] text-[var(--muted)]">
        {isAdmin ? t(locale, "login.adminHint") : t(locale, "login.employeeHint")}
      </p>
      <hr className="rule-accent mb-6 mt-4" />
      <Card>
        <form onSubmit={onSubmit} className="space-y-5">
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
              className={isAdmin ? "normal-case" : undefined}
              placeholder={isAdmin ? "thenovaworkforce@gmail.com" : "NW-0020"}
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
              {"/// "}
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading} className="min-h-12 w-full">
            {loading
              ? t(locale, "login.signingIn")
              : `>>> ${isAdmin ? t(locale, "login.adminSubmit") : t(locale, "login.employeeSubmit")}`}
          </Button>
        </form>
        <div className="meta mt-5 flex flex-wrap justify-between gap-3">
          <Link href={isAdmin ? "/login/employee" : "/login/admin"}>
            {isAdmin ? t(locale, "login.switchEmployee") : t(locale, "login.switchAdmin")}
          </Link>
          <Link href="/forgot-password">{t(locale, "login.forgot")}</Link>
        </div>
      </Card>
      {!isAdmin ? (
        <Meta className="mt-4 block normal-case tracking-[0.04em] text-[var(--muted)]">
          {t(locale, "login.demoEmployee")}
        </Meta>
      ) : (
        <Meta className="mt-4 block normal-case tracking-[0.04em] text-[var(--muted)]">
          {t(locale, "login.demoAdmin")}
        </Meta>
      )}
    </div>
  );
}

export default function LoginChooserPage() {
  const locale = "en" as const;
  return (
    <PublicChrome brand={t(locale, "brand")}>
      <BracketLabel>ACCESS / SELECT</BracketLabel>
      <h1 className="h-macro mt-2 text-[clamp(2.2rem,8vw,4rem)]">{t(locale, "login.chooserTitle")}</h1>
      <p className="meta mt-3 max-w-2xl normal-case tracking-[0.04em] text-[var(--muted)]">
        {t(locale, "login.chooserBody")}
      </p>
      <hr className="rule-accent mb-8 mt-4" />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/login/admin" className="block border-2 border-[var(--ink)] bg-[var(--bg)] p-6 hover:border-[var(--accent)]">
          <Meta className="text-[var(--accent)]">01 / ADMIN</Meta>
          <div className="h-display mt-3 text-2xl">{t(locale, "login.adminTitle")}</div>
          <p className="meta mt-3 normal-case tracking-[0.04em] text-[var(--muted)]">
            {t(locale, "login.adminHint")}
          </p>
          <div className="meta mt-6 text-[var(--accent)]">{">>> "}{t(locale, "nav.login")}</div>
        </Link>
        <Link href="/login/employee" className="block border-2 border-[var(--ink)] bg-[var(--bg-alt)] p-6 hover:border-[var(--accent)]">
          <Meta className="text-[var(--accent)]">02 / EMPLOYEE</Meta>
          <div className="h-display mt-3 text-2xl">{t(locale, "login.employeeTitle")}</div>
          <p className="meta mt-3 normal-case tracking-[0.04em] text-[var(--muted)]">
            {t(locale, "login.employeeHint")}
          </p>
          <div className="meta mt-6 text-[var(--accent)]">{">>> "}{t(locale, "nav.login")}</div>
        </Link>
      </div>
    </PublicChrome>
  );
}
