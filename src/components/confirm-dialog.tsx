"use client";

import { Button } from "@/components/ui";
import { t } from "@/i18n";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface)] p-5 shadow-[var(--nova-shadow)]">
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-[var(--nova-ink)]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--nova-muted)]">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={onConfirm}>
            {busy ? t("en", "common.loading") : confirmLabel ?? t("en", "common.confirm")}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel ?? t("en", "common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
