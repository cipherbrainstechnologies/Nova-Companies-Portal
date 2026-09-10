"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { Modal } from "@/components/modal";
import { t } from "@/i18n";

export type EditEmployeeInitial = {
  firstName: string;
  lastName: string;
  displayName: string;
  designation: string;
  department: string;
  location: string;
  dateOfJoining: string;
  pan: string;
  pfNumber: string;
  uan: string;
  esiNumber: string;
  personalEmail: string;
  officialEmail: string;
  primaryPhone: string;
  alternatePhone: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
};

function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function EditEmployeeForm({
  companyId,
  employeeId,
  initial,
  canEdit,
}: {
  companyId: string;
  employeeId: string;
  initial: EditEmployeeInitial;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(initial);

  if (!canEdit) return null;

  function setField<K extends keyof EditEmployeeInitial>(key: K, value: EditEmployeeInitial[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openModal() {
    setForm(initial);
    setError("");
    setMessage("");
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          firstName: form.firstName,
          lastName: form.lastName,
          displayName: form.displayName || null,
          designation: form.designation || null,
          department: form.department || null,
          location: form.location || null,
          dateOfJoining: form.dateOfJoining || null,
          pan: form.pan || null,
          pfNumber: form.pfNumber || null,
          uan: form.uan || null,
          esiNumber: form.esiNumber || null,
          contact: {
            personalEmail: form.personalEmail || null,
            officialEmail: form.officialEmail || null,
            primaryPhone: form.primaryPhone || null,
            alternatePhone: form.alternatePhone || null,
          },
          bank: {
            bankName: form.bankName || null,
            accountNumber: form.accountNumber || null,
            ifsc: form.ifsc || null,
            accountHolderName: form.accountHolderName || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("en", "common.failed"));
      setMessage(t("en", "admin.profileSaved"));
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("en", "common.failed"));
    } finally {
      setBusy(false);
    }
  }

  const profileFields: Array<[keyof EditEmployeeInitial, string, string]> = [
    ["firstName", "admin.firstName", "text"],
    ["lastName", "admin.lastName", "text"],
    ["displayName", "admin.displayName", "text"],
    ["designation", "admin.designation", "text"],
    ["department", "admin.department", "text"],
    ["location", "admin.location", "text"],
    ["dateOfJoining", "admin.dateOfJoining", "date"],
    ["pan", "admin.pan", "text"],
    ["pfNumber", "admin.pfNumber", "text"],
    ["uan", "admin.uan", "text"],
    ["esiNumber", "admin.esiNumber", "text"],
  ];

  const contactFields: Array<[keyof EditEmployeeInitial, string]> = [
    ["personalEmail", "admin.personalEmail"],
    ["officialEmail", "admin.officialEmail"],
    ["primaryPhone", "admin.primaryPhone"],
    ["alternatePhone", "admin.alternatePhone"],
  ];

  const bankFields: Array<[keyof EditEmployeeInitial, string]> = [
    ["bankName", "admin.bankName"],
    ["accountNumber", "admin.accountNumber"],
    ["ifsc", "admin.ifsc"],
    ["accountHolderName", "admin.accountHolderName"],
  ];

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={openModal}>
        {t("en", "admin.editProfile")}
      </Button>
      {message ? <AlertBanner tone="success">{message}</AlertBanner> : null}

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={t("en", "admin.editProfile")}
        description={t("en", "admin.editProfileNote")}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.profileSummary")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {profileFields.map(([key, labelKey, type]) => (
                <div key={key}>
                  <Label htmlFor={`edit-${key}`}>{t("en", labelKey)}</Label>
                  <Input
                    id={`edit-${key}`}
                    type={type}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    required={key === "firstName" || key === "lastName"}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.contactDetails")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {contactFields.map(([key, labelKey]) => (
                <div key={key}>
                  <Label htmlFor={`edit-${key}`}>{t("en", labelKey)}</Label>
                  <Input
                    id={`edit-${key}`}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--nova-muted)]">
              {t("en", "admin.bankDetails")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {bankFields.map(([key, labelKey]) => (
                <div key={key}>
                  <Label htmlFor={`edit-${key}`}>{t("en", labelKey)}</Label>
                  <Input
                    id={`edit-${key}`}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? t("en", "common.loading") : t("en", "admin.saveProfile")}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              {t("en", "common.cancel")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function editEmployeeInitialFrom(employee: {
  firstName: string;
  lastName: string;
  displayName?: string | null;
  designation?: string | null;
  department?: string | null;
  location?: string | null;
  dateOfJoining?: Date | string | null;
  pan?: string | null;
  pfNumber?: string | null;
  uan?: string | null;
  esiNumber?: string | null;
  contact?: {
    personalEmail?: string | null;
    officialEmail?: string | null;
    primaryPhone?: string | null;
    alternatePhone?: string | null;
  } | null;
  bankAccount?: {
    bankName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
  } | null;
}): EditEmployeeInitial {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    displayName: employee.displayName ?? "",
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    location: employee.location ?? "",
    dateOfJoining: toDateInput(employee.dateOfJoining),
    pan: employee.pan ?? "",
    pfNumber: employee.pfNumber ?? "",
    uan: employee.uan ?? "",
    esiNumber: employee.esiNumber ?? "",
    personalEmail: employee.contact?.personalEmail ?? "",
    officialEmail: employee.contact?.officialEmail ?? "",
    primaryPhone: employee.contact?.primaryPhone ?? "",
    alternatePhone: employee.contact?.alternatePhone ?? "",
    bankName: employee.bankAccount?.bankName ?? "",
    accountNumber: employee.bankAccount?.accountNumber ?? "",
    ifsc: employee.bankAccount?.ifsc ?? "",
    accountHolderName: employee.bankAccount?.accountHolderName ?? "",
  };
}
