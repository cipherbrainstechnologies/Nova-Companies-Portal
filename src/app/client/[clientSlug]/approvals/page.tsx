"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card } from "@/components/ui";

type Task = { id: string; title: string; taskType: string; status: string };

export default function ClientApprovalsPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);

  function load() {
    fetch(`/api/client/${clientSlug}/approvals`).then((r) => r.json()).then((d) => setTasks(d.tasks ?? []));
  }

  useEffect(() => {
    load();
  }, [clientSlug]);

  async function decide(taskId: string, decision: "APPROVED" | "REJECTED") {
    await fetch(`/api/client/${clientSlug}/approvals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, decision }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Approvals</h2>
      <Card className="divide-y p-0">
        {tasks.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-[var(--nova-muted)]">{t.taskType}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => decide(t.id, "APPROVED")}>Approve</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => decide(t.id, "REJECTED")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
        {!tasks.length ? <p className="p-6 text-sm text-[var(--nova-muted)]">No open approvals.</p> : null}
      </Card>
    </div>
  );
}
