"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

export default function ClientActivityPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [rows, setRows] = useState<Array<{ id: string; action: string; createdAt: string }>>([]);

  useEffect(() => {
    fetch(`/api/client/${clientSlug}/activity`)
      .then((r) => r.json())
      .then((d) => setRows(d.activity ?? []));
  }, [clientSlug]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Activity</h2>
      <Card className="divide-y p-0 text-sm">
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between gap-4 p-3">
            <span>{r.action}</span>
            <span className="text-[var(--nova-muted)]">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {!rows.length ? <p className="p-6 text-[var(--nova-muted)]">No activity yet.</p> : null}
      </Card>
    </div>
  );
}
