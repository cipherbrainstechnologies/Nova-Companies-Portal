"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner, BracketLabel, Meta } from "@/components/industrial";
import { EMPLOYEE_DOCUMENT_FOLDERS } from "@/lib/employee-document-folders";

type DocRow = {
  id: string;
  folder: string;
  folderLabel: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocumentFolders({
  companyId,
  employeeId,
  employeeName,
  initialDocuments,
  canEdit,
}: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  initialDocuments: DocRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [openFolder, setOpenFolder] = useState<string>(EMPLOYEE_DOCUMENT_FOLDERS[0].id);
  const [busyFolder, setBusyFolder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const byFolder = useMemo(() => {
    const map = new Map<string, DocRow[]>();
    for (const folder of EMPLOYEE_DOCUMENT_FOLDERS) map.set(folder.id, []);
    for (const doc of documents) {
      const list = map.get(doc.folder) ?? [];
      list.push(doc);
      map.set(doc.folder, list);
    }
    return map;
  }, [documents]);

  async function onUpload(folder: string, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusyFolder(folder);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("companyId", companyId);
      form.set("folder", folder);
      form.set("file", file);
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setDocuments((prev) => [data.document as DocRow, ...prev]);
      setMessage(`Uploaded to ${data.document.folderLabel}.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setBusyFolder(null);
    }
  }

  async function onDownload(doc: DocRow) {
    setError("");
    try {
      const res = await fetch(
        `/api/employees/${employeeId}/documents/${doc.id}/download?companyId=${encodeURIComponent(companyId)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Download failed");
      window.open(data.url as string, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed");
    }
  }

  async function onDelete(doc: DocRow) {
    if (!window.confirm(`Remove “${doc.title}” from this folder?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, documentId: doc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setDocuments((prev) => prev.filter((row) => row.id !== doc.id));
      setMessage("Document removed.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed");
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <BracketLabel>Employee documents</BracketLabel>
        <h3 className="mt-2 text-lg font-semibold text-[var(--nova-ink)]">{employeeName}</h3>
        <p className="mt-1 text-sm text-[var(--nova-muted)]">
          Folder layout: Offer Letter and Contract · KYC and Documents · Salary Slips. Upload
          directly into each subfolder.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EMPLOYEE_DOCUMENT_FOLDERS.map((folder) => {
          const count = byFolder.get(folder.id)?.length ?? 0;
          const active = openFolder === folder.id;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => setOpenFolder(folder.id)}
              className={`rounded-[var(--nova-radius-sm)] border px-3 py-2 text-left text-sm ${
                active
                  ? "border-[var(--nova-teal)] bg-[var(--nova-teal)] text-white"
                  : "border-[var(--nova-border)] bg-[var(--nova-surface)] text-[var(--nova-text)]"
              }`}
            >
              <span className="font-semibold">{folder.label}</span>
              <span className={`mt-0.5 block text-xs ${active ? "text-white/80" : "text-[var(--nova-muted)]"}`}>
                {count} file{count === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>

      {EMPLOYEE_DOCUMENT_FOLDERS.filter((folder) => folder.id === openFolder).map((folder) => {
        const rows = byFolder.get(folder.id) ?? [];
        return (
          <div key={folder.id} className="space-y-3 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[var(--nova-ink)]">{folder.label}</div>
                <Meta>
                  {employeeName} / {folder.label}
                </Meta>
              </div>
              {canEdit ? (
                <div>
                  <Label htmlFor={`upload-${folder.id}`} className="sr-only">
                    Upload to {folder.label}
                  </Label>
                  <Input
                    id={`upload-${folder.id}`}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,image/*"
                    disabled={busyFolder === folder.id}
                    onChange={(e) => {
                      void onUpload(folder.id, e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <p className="mt-1 text-xs text-[var(--nova-muted)]">
                    {busyFolder === folder.id ? "Uploading…" : "PDF, Word, or image · max 15 MB"}
                  </p>
                </div>
              ) : null}
            </div>

            {rows.length ? (
              <ul className="divide-y divide-[var(--nova-border)]">
                {rows.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--nova-ink)]">{doc.title}</div>
                      <Meta>
                        {formatBytes(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString()}
                      </Meta>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => void onDownload(doc)}>
                        Download
                      </Button>
                      {canEdit ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void onDelete(doc)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--nova-muted)]">No files in this folder yet.</p>
            )}
          </div>
        );
      })}

      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
    </Card>
  );
}
