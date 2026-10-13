"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function TemplateActions({
  templateId,
  code,
  body,
  status,
}: {
  templateId: string;
  code: string;
  body: string;
  status: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState("");

  async function post(action: "version" | "approve" | "retire") {
    setError("");
    const res = await fetch("/api/admin/legal-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        code,
        templateId,
        bodyMarkdown: action === "version" ? draft : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <textarea className="min-h-40 w-full rounded border p-2 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => post("version")}>Save as new version</Button>
        {status === "DRAFT" ? <Button type="button" onClick={() => post("approve")}>Approve this version</Button> : null}
        {status !== "RETIRED" ? <Button type="button" onClick={() => post("retire")}>Retire</Button> : null}
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
