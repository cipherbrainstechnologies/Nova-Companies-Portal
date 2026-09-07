"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

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
      setError(data.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["firstName", "First name"],
            ["lastName", "Last name"],
            ["primaryPhone", "Primary phone"],
            ["officialEmail", "Official email"],
            ["designation", "Designation"],
            ["temporaryPassword", "Temporary password"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              type={key === "temporaryPassword" ? "password" : "text"}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={key !== "designation"}
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <Button type="submit">Create employee</Button>
        </div>
      </form>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
    </Card>
  );
}
