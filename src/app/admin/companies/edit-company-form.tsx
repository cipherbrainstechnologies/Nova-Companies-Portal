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
  logoKey?: string | null;
};

export function EditCompanyButton({ company }: { company: CompanyFields }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company.name);
  const [gstin, setGstin] = useState(company.gstin ?? "");
  const [address, setAddress] = useState(company.address ?? "");
  const [email, setEmail] = useState(company.email ?? "");
  const [phone, setPhone] = useState(company.phone ?? "");
  const [logoPreview, setLogoPreview] = useState<string | null>(
    company.logoKey ? `/api/companies/${company.id}/logo` : null,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function openModal() {
    setName(company.name);
    setGstin(company.gstin ?? "");
    setAddress(company.address ?? "");
    setEmail(company.email ?? "");
    setPhone(company.phone ?? "");
    setLogoPreview(company.logoKey ? `/api/companies/${company.id}/logo?t=${Date.now()}` : null);
    setLogoFile(null);
    setError("");
    setOpen(true);
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
    }
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
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? t("en", "common.failed"));
      return;
    }

    if (logoFile) {
      const form = new FormData();
      form.append("file", logoFile);
      const logoRes = await fetch(`/api/companies/${company.id}/logo`, {
        method: "POST",
        body: form,
      });
      const logoData = await logoRes.json();
      if (!logoRes.ok) {
        setBusy(false);
        setError(logoData.error ?? t("en", "company.logo.uploadFailed"));
        return;
      }
    }

    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openModal}>
        {t("en", "company.editDetails")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("en", "company.editTitle")}
        description={t("en", "company.editDescription")}
      >
        <form onSubmit={onSave} className="space-y-3">
          <div>
            <Label htmlFor="company-logo">{t("en", "company.logo.label")}</Label>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--nova-radius)] border border-[var(--nova-border)] bg-[var(--nova-surface-muted)]">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-[var(--nova-muted)]">{t("en", "company.logo.none")}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  id="company-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={onLogoChange}
                />
                <p className="mt-1 text-xs text-[var(--nova-muted)]">{t("en", "company.logo.hint")}</p>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="company-name">{t("en", "admin.name")}</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="company-email">{t("en", "company.email")}</Label>
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="accounts@company.com"
            />
          </div>
          <div>
            <Label htmlFor="company-phone">{t("en", "company.phone")}</Label>
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
              {t("en", "common.cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("en", "common.loading") : t("en", "common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
