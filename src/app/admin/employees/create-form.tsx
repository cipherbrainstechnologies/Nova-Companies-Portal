"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { t } from "@/i18n";

export function CreateEmployeeForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    primaryPhone: "",
    officialEmail: "",
    temporaryPassword: "",
    designation: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, ...form }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    router.refresh();
  }

  const fields = [
    ["firstName", "admin.firstName", false],
    ["lastName", "admin.lastName", false],
    ["primaryPhone", "admin.primaryPhone", false],
    ["officialEmail", "admin.officialEmail", false],
    ["designation", "admin.designation", false],
    ["temporaryPassword", "admin.tempPassword", true],
  ] as const;

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        {fields.map(([key, labelKey, isPassword]) => (
          <div key={key}>
            <Label>{t("en", labelKey)}</Label>
            <Input
              type={isPassword ? "password" : "text"}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={key !== "designation"}
              className={isPassword || key === "officialEmail" ? "normal-case" : undefined}
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <Button type="submit">&gt;&gt;&gt; {t("en", "admin.createEmployee")}</Button>
        </div>
      </form>
      {error ? <p className="meta mt-2 text-[var(--accent)]">{'/// '} {error}</p> : null}
    </Card>
  );
}
