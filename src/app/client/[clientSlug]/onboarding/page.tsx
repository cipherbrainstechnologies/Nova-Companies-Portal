"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input, Label } from "@/components/ui";
import { AlertBanner } from "@/components/industrial";
import { COMMERCIAL_PLANS, formatMonthlyFee } from "@/content/public-site/commercial-plans";

type Address = {
  registeredAddress?: string;
  sector?: string;
  authorisedRepresentative?: string;
  primaryContact?: string;
  billingContact?: string;
  commencementDate?: string;
};

type OnboardingPayload = {
  client: {
    lifecycleStatus: string;
    legalName: string;
    tradeName: string | null;
    countryCode: string;
    registrationNumber: string | null;
    website: string | null;
    intendedEmployeeCount: number | null;
    billingAddressJson: Address | null;
  };
  case: {
    checklistJson: { proposedPlanId?: string } | null;
    kybDocuments: Array<{ id: string; category: string; status: string }>;
    complianceReviews: Array<{ outcome: string; createdAt: string }>;
  } | null;
};

const COUNTRIES = [
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["AE", "United Arab Emirates"],
] as const;

export default function ClientOnboardingPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const [data, setData] = useState<OnboardingPayload | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({
    legalName: "",
    tradeName: "",
    countryCode: "GB",
    registrationNumber: "",
    website: "",
    intendedEmployeeCount: "",
    registeredAddress: "",
    sector: "",
    authorisedRepresentative: "",
    primaryContact: "",
    billingContact: "",
    commencementDate: "",
  });
  const [planId, setPlanId] = useState("essential");

  async function load() {
    const response = await fetch(`/api/client/${clientSlug}/onboarding`);
    if (!response.ok) throw new Error("Unable to load onboarding");
    const payload = (await response.json()) as OnboardingPayload;
    setData(payload);
    const address = payload.client.billingAddressJson ?? {};
    setProfile({
      legalName: payload.client.legalName ?? "",
      tradeName: payload.client.tradeName ?? "",
      countryCode: payload.client.countryCode || "GB",
      registrationNumber: payload.client.registrationNumber ?? "",
      website: payload.client.website ?? "",
      intendedEmployeeCount: payload.client.intendedEmployeeCount ? String(payload.client.intendedEmployeeCount) : "",
      registeredAddress: address.registeredAddress ?? "",
      sector: address.sector ?? "",
      authorisedRepresentative: address.authorisedRepresentative ?? "",
      primaryContact: address.primaryContact ?? "",
      billingContact: address.billingContact ?? "",
      commencementDate: address.commencementDate ?? "",
    });
    if (payload.case?.checklistJson?.proposedPlanId) {
      setPlanId(payload.case.checklistJson.proposedPlanId);
    }
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load onboarding"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSlug]);

  async function post(body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch(`/api/client/${clientSlug}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Request failed");
      return null;
    }
    return json;
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const saved = await post({
      action: "profile",
      legalName: profile.legalName,
      tradeName: profile.tradeName || undefined,
      countryCode: profile.countryCode,
      registrationNumber: profile.registrationNumber || undefined,
      website: profile.website || undefined,
      intendedEmployeeCount: profile.intendedEmployeeCount ? Number(profile.intendedEmployeeCount) : undefined,
      registeredAddress: profile.registeredAddress || undefined,
      sector: profile.sector || undefined,
      authorisedRepresentative: profile.authorisedRepresentative || undefined,
      primaryContact: profile.primaryContact || undefined,
      billingContact: profile.billingContact || undefined,
      commencementDate: profile.commencementDate || undefined,
    });
    if (saved) {
      setNotice("Company details saved.");
      await load();
    }
  }

  async function savePlan() {
    const saved = await post({ action: "plan", planId });
    if (saved) {
      setNotice("Draft plan saved. It is not a contract until Nova approves the commercial schedule.");
      await load();
    }
  }

  async function upload(file: File, category: string) {
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("category", category);
    form.set("file", file);
    const res = await fetch(`/api/client/${clientSlug}/onboarding/kyb`, { method: "POST", body: form });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Upload failed");
      return;
    }
    setNotice("Document stored.");
    await load();
  }

  async function submit() {
    const result = await post({ action: "submit" });
    if (!result) return;
    setNotice(result.alreadySubmitted ? "This onboarding is already with Nova." : "Submitted for Nova review.");
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Company onboarding</h2>
        <p className="mt-1 text-sm text-[var(--nova-muted)]">
          Status: {data ? data.client.lifecycleStatus.replace(/_/g, " ") : "Loading"}
        </p>
      </div>
      {error ? <AlertBanner tone="danger">{error}</AlertBanner> : null}
      {notice ? <p role="status" className="text-sm font-medium text-[var(--nova-success)]">{notice}</p> : null}

      <Card className="p-4 md:p-6">
        <h3 className="font-semibold">Company information</h3>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
          <Field label="Registered company name" value={profile.legalName} onChange={(value) => setProfile({ ...profile, legalName: value })} required />
          <Field label="Trading name" value={profile.tradeName} onChange={(value) => setProfile({ ...profile, tradeName: value })} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="country">Country of incorporation</Label>
            <select
              id="country"
              className="min-h-11 rounded-[var(--nova-radius-sm)] border border-[var(--nova-border-strong)] px-3 text-sm"
              value={profile.countryCode}
              onChange={(event) => setProfile({ ...profile, countryCode: event.target.value })}
            >
              {COUNTRIES.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
              {COUNTRIES.some(([code]) => code === profile.countryCode) ? null : (
                <option value={profile.countryCode}>{profile.countryCode}</option>
              )}
            </select>
          </div>
          <Field label="Registration number" value={profile.registrationNumber} onChange={(value) => setProfile({ ...profile, registrationNumber: value })} />
          <Field label="Website" value={profile.website} onChange={(value) => setProfile({ ...profile, website: value })} />
          <Field label="Expected Indian employees" value={profile.intendedEmployeeCount} onChange={(value) => setProfile({ ...profile, intendedEmployeeCount: value })} />
          <Field label="Registered address" value={profile.registeredAddress} onChange={(value) => setProfile({ ...profile, registeredAddress: value })} />
          <Field label="Business sector" value={profile.sector} onChange={(value) => setProfile({ ...profile, sector: value })} />
          <Field label="Authorised representative" value={profile.authorisedRepresentative} onChange={(value) => setProfile({ ...profile, authorisedRepresentative: value })} />
          <Field label="Primary contact" value={profile.primaryContact} onChange={(value) => setProfile({ ...profile, primaryContact: value })} />
          <Field label="Billing contact" value={profile.billingContact} onChange={(value) => setProfile({ ...profile, billingContact: value })} />
          <Field label="Proposed commencement date" value={profile.commencementDate} onChange={(value) => setProfile({ ...profile, commencementDate: value })} type="date" />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>Save company details</Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 md:p-6">
        <h3 className="font-semibold">Verification documents</h3>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
          Upload the certificate of incorporation or equivalent, and any signatory or ownership document Nova has requested. Files stay in private storage.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Upload label="Certificate of incorporation" category="INCORPORATION" busy={busy} onFile={upload} />
          <Upload label="Authorised signatory" category="SIGNATORY" busy={busy} onFile={upload} />
          <Upload label="Ownership / KYC" category="OWNERSHIP" busy={busy} onFile={upload} />
          <Upload label="Other compliance document" category="OTHER" busy={busy} onFile={upload} />
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          {data?.case?.kybDocuments.map((doc) => (
            <li key={doc.id}>{doc.category}: {doc.status}</li>
          ))}
          {!data?.case?.kybDocuments.length ? <li className="text-[var(--nova-muted)]">No documents uploaded yet.</li> : null}
        </ul>
      </Card>

      <Card className="p-4 md:p-6">
        <h3 className="font-semibold">Proposed EOR plan</h3>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
          This saves a draft preference. Nova approves the commercial schedule before any fee is billed.
        </p>
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Plan</legend>
          {COMMERCIAL_PLANS.map((plan) => (
            <label key={plan.id} className="flex min-h-11 items-start gap-3 rounded-xl border border-[var(--nova-border)] px-3 py-3">
              <input type="radio" name="plan" value={plan.id} checked={planId === plan.id} onChange={() => setPlanId(plan.id)} />
              <span>
                <span className="font-semibold">{plan.name}</span>
                <span className="mt-1 block text-sm text-[var(--nova-muted)]">
                  {formatMonthlyFee(plan.monthlyFeeInr)} {plan.priceDetail}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="button" className="mt-4" disabled={busy} onClick={savePlan}>Save draft plan</Button>
      </Card>

      <Card className="p-4 md:p-6">
        <h3 className="font-semibold">Agreement and review</h3>
        <p className="mt-2 text-sm text-[var(--nova-text-secondary)]">
          Nova prepares the service agreement and commercial schedule. A checkbox on this page does not execute that agreement. Activation still requires the employing entity, an executed agreement, and an approved price.
        </p>
        <Button type="button" className="mt-4" disabled={busy} onClick={submit}>
          Submit for Nova review
        </Button>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Upload({
  label,
  category,
  busy,
  onFile,
}: {
  label: string;
  category: string;
  busy: boolean;
  onFile: (file: File, category: string) => void;
}) {
  const id = `upload-${category}`;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.docx"
        disabled={busy}
        className="text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file, category);
        }}
      />
    </div>
  );
}
