"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { PayslipPreview } from "@/components/payslip-preview";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export function TemplateUploadForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [cssBody, setCssBody] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function acceptFile(f: File | null | undefined) {
    if (!f) return;
    if (!/\.(html?|txt)$/i.test(f.name)) {
      setError(t("en", "admin.templateFileInvalid"));
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    const text = await f.text();
    setHtmlBody(text);
  }

  async function preview() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/templates/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId,
        htmlBody: htmlBody || undefined,
        cssBody: cssBody || undefined,
        sample: true,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    setPreviewHtml(data.html ?? "");
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!file && !htmlBody.trim()) {
      setError(t("en", "admin.templateBodyRequired"));
      return;
    }
    setBusy(true);
    const body = new FormData();
    body.set("companyId", companyId);
    if (name.trim()) body.set("name", name.trim());
    if (cssBody.trim()) body.set("cssBody", cssBody);
    if (file) {
      body.set("file", file);
    } else {
      body.set("htmlBody", htmlBody);
    }
    const res = await fetch("/api/templates", { method: "POST", body });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    setMessage(t("en", "admin.templateUploaded"));
    setFile(null);
    setHtmlBody("");
    setCssBody("");
    setName("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <form onSubmit={upload} className="space-y-4">
          <div>
            <Label htmlFor="template-name">{t("en", "admin.templateName")}</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("en", "admin.templateNamePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("en", "admin.templateFile")}</Label>
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-[var(--nova-radius)] border-2 border-dashed px-4 py-8 text-center transition",
                dragOver
                  ? "border-[var(--nova-teal)] bg-[var(--nova-teal-soft)]"
                  : "border-[var(--nova-border-strong)] bg-[var(--nova-surface-muted)] hover:border-[var(--nova-teal)]",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void acceptFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
            >
              <p className="text-sm font-semibold text-[var(--nova-ink)]">
                {t("en", "admin.templateDropHint")}
              </p>
              <p className="mt-1 text-xs text-[var(--nova-muted)]">
                {t("en", "admin.templateDropTypes")}
              </p>
              {file ? (
                <p className="mt-3 text-sm font-medium text-[var(--nova-teal)]">{file.name}</p>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept=".html,.htm,.txt"
                className="hidden"
                onChange={(e) => void acceptFile(e.target.files?.[0])}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="template-css">{t("en", "admin.templateCss")}</Label>
            <textarea
              id="template-css"
              value={cssBody}
              onChange={(e) => setCssBody(e.target.value)}
              rows={5}
              className="w-full rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] bg-[var(--nova-surface)] px-3 py-2.5 font-mono text-xs text-[var(--nova-text)]"
              placeholder={t("en", "admin.templateCssPlaceholder")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void preview()}>
              {t("en", "admin.preview")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("en", "common.loading") : t("en", "admin.uploadTemplate")}
            </Button>
          </div>
          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
          {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
        </form>
      </Card>
      <Card>
        <PayslipPreview html={previewHtml} label={t("en", "admin.samplePreview")} />
        <p className="mt-2 text-xs text-[var(--nova-muted)]">{t("en", "admin.samplePreviewNote")}</p>
      </Card>
    </div>
  );
}
