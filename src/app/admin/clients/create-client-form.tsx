"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";

const empty = {
  legalName: "",
  tradeName: "",
  registrationNumber: "",
  countryCode: "GB",
  registeredAddress: "",
  website: "",
  industry: "",
  taxId: "",
  representativeName: "",
  representativePosition: "",
  representativeEmail: "",
  representativePhone: "",
  planId: "managed",
  proposedFee: "",
  billingCurrency: "GBP",
  paymentTerms: "",
  minimumEngagement: "",
  intendedEmployeeCount: "",
  commencementDate: "",
  additionalServices: "",
  proposedNovaCompanyId: "",
  workforceMode: "new_hires",
  dataProcessing: "unknown",
  specialCompliance: "",
  governingLaw: "",
};

export function CreateClientForm({ companies }: { companies: Array<{ id: string; name: string; prefix: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName: form.legalName,
        tradeName: form.tradeName || undefined,
        countryCode: form.countryCode,
        registrationNumber: form.registrationNumber || undefined,
        taxId: form.taxId || undefined,
        website: form.website || undefined,
        billingCurrency: form.billingCurrency,
        intendedEmployeeCount: form.intendedEmployeeCount ? Number(form.intendedEmployeeCount) : undefined,
        proposedNovaCompanyId: form.proposedNovaCompanyId || undefined,
        profile: {
          registeredAddress: form.registeredAddress || undefined,
          industry: form.industry || undefined,
          representativeName: form.representativeName || undefined,
          representativePosition: form.representativePosition || undefined,
          representativeEmail: form.representativeEmail || undefined,
          representativePhone: form.representativePhone || undefined,
          planId: form.planId,
          proposedFee: form.proposedFee || undefined,
          paymentTerms: form.paymentTerms || undefined,
          minimumEngagement: form.minimumEngagement || undefined,
          commencementDate: form.commencementDate || undefined,
          additionalServices: form.additionalServices || undefined,
          workforceMode: form.workforceMode,
          dataProcessing: form.dataProcessing,
          specialCompliance: form.specialCompliance || undefined,
          governingLaw: form.governingLaw || undefined,
        },
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    router.push(`/admin/clients/${data.client.id}`);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Add client</h2>
          <p className="text-sm text-[var(--nova-muted)]">
            Incomplete legal fields are allowed. Documents that need them are marked Awaiting Information.
          </p>
        </div>
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="mb-2 font-medium">Company</legend>
          <Field label="Legal company name"><Input required value={form.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
          <Field label="Trading name"><Input value={form.tradeName} onChange={(e) => set("tradeName", e.target.value)} /></Field>
          <Field label="Registration number"><Input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} /></Field>
          <Field label="Country of incorporation"><Input required maxLength={2} value={form.countryCode} onChange={(e) => set("countryCode", e.target.value)} /></Field>
          <Field label="Registered address"><Input value={form.registeredAddress} onChange={(e) => set("registeredAddress", e.target.value)} /></Field>
          <Field label="Website"><Input value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
          <Field label="Business industry"><Input value={form.industry} onChange={(e) => set("industry", e.target.value)} /></Field>
          <Field label="Tax identification"><Input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} /></Field>
        </fieldset>
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="mb-2 font-medium">Authorised representative</legend>
          <Field label="Full name"><Input value={form.representativeName} onChange={(e) => set("representativeName", e.target.value)} /></Field>
          <Field label="Position"><Input value={form.representativePosition} onChange={(e) => set("representativePosition", e.target.value)} /></Field>
          <Field label="Business email"><Input type="email" value={form.representativeEmail} onChange={(e) => set("representativeEmail", e.target.value)} /></Field>
          <Field label="Contact number"><Input value={form.representativePhone} onChange={(e) => set("representativePhone", e.target.value)} /></Field>
        </fieldset>
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="mb-2 font-medium">Commercial preference</legend>
          <Field label="Plan">
            <select className="w-full rounded border px-3 py-2" value={form.planId} onChange={(e) => set("planId", e.target.value)}>
              <option value="essential">EOR Essential</option>
              <option value="managed">EOR Managed</option>
              <option value="enterprise">EOR Enterprise</option>
            </select>
          </Field>
          <Field label="Agreed or proposed fee"><Input value={form.proposedFee} onChange={(e) => set("proposedFee", e.target.value)} /></Field>
          <Field label="Billing currency"><Input value={form.billingCurrency} onChange={(e) => set("billingCurrency", e.target.value)} /></Field>
          <Field label="Payment terms"><Input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></Field>
          <Field label="Minimum engagement"><Input value={form.minimumEngagement} onChange={(e) => set("minimumEngagement", e.target.value)} /></Field>
          <Field label="Expected headcount"><Input value={form.intendedEmployeeCount} onChange={(e) => set("intendedEmployeeCount", e.target.value)} /></Field>
          <Field label="Proposed commencement"><Input type="date" value={form.commencementDate} onChange={(e) => set("commencementDate", e.target.value)} /></Field>
          <Field label="Additional services"><Input value={form.additionalServices} onChange={(e) => set("additionalServices", e.target.value)} /></Field>
        </fieldset>
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="mb-2 font-medium">EOR configuration</legend>
          <Field label="Proposed Indian legal employer">
            <select className="w-full rounded border px-3 py-2" value={form.proposedNovaCompanyId} onChange={(e) => set("proposedNovaCompanyId", e.target.value)}>
              <option value="">Not selected</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.prefix} — {company.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Workforce">
            <select className="w-full rounded border px-3 py-2" value={form.workforceMode} onChange={(e) => set("workforceMode", e.target.value)}>
              <option value="new_hires">New hires</option>
              <option value="transfer">Existing workforce transfer</option>
              <option value="both">New hires and transfer</option>
            </select>
          </Field>
          <Field label="Data processing">
            <select className="w-full rounded border px-3 py-2" value={form.dataProcessing} onChange={(e) => set("dataProcessing", e.target.value)}>
              <option value="unknown">Not yet assessed</option>
              <option value="required">Processing agreement required</option>
              <option value="not_required">Not required</option>
            </select>
          </Field>
          <Field label="Governing law (leave blank if unset)"><Input value={form.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} /></Field>
          <Field label="Special compliance"><Input value={form.specialCompliance} onChange={(e) => set("specialCompliance", e.target.value)} /></Field>
        </fieldset>
        {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
        <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Add client"}</Button>
      </form>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
