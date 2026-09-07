"use client";

import { Button } from "@/components/ui";
import { t } from "@/i18n";

export function DownloadButton({ payslipId, label }: { payslipId: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        const res = await fetch(`/api/payslips/${payslipId}/download`);
        const data = await res.json();
        if (res.ok && data.url) window.location.href = data.url;
        else alert(data.error ?? t("en", "common.downloadFailed"));
      }}
    >
      {'>>> '} {label}
    </Button>
  );
}
