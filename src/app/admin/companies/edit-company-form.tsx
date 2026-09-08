"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { Modal } from "@/components/modal";
import { t } from "@/i18n";

type CompanyFields = {
  id: string;
  name: string;
  gstin: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

export function EditCompanyButton({ company }: { company: CompanyFields }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [gstin, setGstin] = useState(company.gstin ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function openModal() {
    setName(company.name);
    setGstin(company.gstin ?? "");
    setAddress(company.address ?? "");
    setEmail(company.email ?? "");
    setPhone(company.phone ?? "");
    setError("");
    setOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        gstin: gstin.trim() || null,
        address: address.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? t("en", "common.failed"));
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openModal}>
        Edit details
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit legal entity"
        description="Update company identity and contact details used across payroll and documents."
      >
        <form onSubmit={onSave} className="space-y-3">
          <div>
            <Label htmlFor="company-name">Company name</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="company-email">Company email</Label>
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="accounts@company.com"
            />
          </div>
          <div>
            <Label htmlFor="company-phone">Company phone</Label>
            <Input
              id="company-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91…"
            />
          </div>
          <div>
            <Label htmlFor="company-gstin">{t("en", "admin.gstin")}</Label>
            <Input id="company-gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="company-address">{t("en", "admin.address")}</Label>
            <Input id="company-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
