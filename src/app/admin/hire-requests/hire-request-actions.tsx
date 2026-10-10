"use client";

import { Button } from "@/components/ui";

export function HireRequestActions({ requestId }: { requestId: string }) {
  async function review(status: "NOVA_REVIEW" | "OFFER_PENDING" | "REJECTED" | "MORE_INFO") {
    await fetch(`/api/admin/hire-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={() => review("OFFER_PENDING")}>Approve</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => review("MORE_INFO")}>More info</Button>
      <Button type="button" size="sm" variant="danger" onClick={() => review("REJECTED")}>Reject</Button>
    </div>
  );
}
