"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

export function StatementUploadForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    const body = new FormData();
    body.set("companyId", companyId);
    body.set("file", file);
    const res = await fetch("/api/statements", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Statement PDF / CSV / XLSX</Label>
          <Input
            type="file"
            accept=".pdf,.csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit">Upload</Button>
      </form>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
    </Card>
  );
}
