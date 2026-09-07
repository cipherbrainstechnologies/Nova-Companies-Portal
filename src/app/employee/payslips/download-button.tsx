"use client";

import { Button } from "@/components/ui";

export function DownloadButton({ payslipId, label }: { payslipId: string; label: string }) {
  return (
    <Button
      type="button"
      onClick={async () => {
        const res = await fetch(`/api/payslips/${payslipId}/download`);
        const data = await res.json();
        if (res.ok && data.url) window.location.href = data.url;
        else alert(data.error ?? "Download failed");
      }}
    >
      {label}
    </Button>
  );
}
