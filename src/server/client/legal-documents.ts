export const LEGAL_REVIEW_FLAGS = [
  "Breach-notification obligations differ across the reference agreements and must be reconciled before approval.",
  "Controller, processor, and subprocessor roles are not assumed. They must be stated for this client.",
  "International transfer mechanisms are not assumed and are not a certification.",
  "Liability and indemnity caps are blank until Nova counsel sets them.",
  "Termination rights and notice periods are blank until Nova counsel sets them.",
  "Governing law and jurisdiction are blank unless supplied. They are not defaulted.",
  "Employee transfer obligations apply only when a transfer is selected.",
  "Payment timing and advance funding are blank unless commercial terms are supplied.",
  "Additional services are outside the base scope unless a schedule is generated.",
  "The Indian employer must be the verified Nova legal entity on the client record. Entities are not interchangeable.",
] as const;

export type WorkforceMode = "new_hires" | "transfer" | "both";
export type DataProcessingChoice = "required" | "not_required" | "unknown";

export type OnboardingProfile = {
  registeredAddress?: string;
  industry?: string;
  representativeName?: string;
  representativePosition?: string;
  representativeEmail?: string;
  representativePhone?: string;
  planId?: "essential" | "managed" | "enterprise";
  proposedFee?: string;
  paymentTerms?: string;
  minimumEngagement?: string;
  commencementDate?: string;
  additionalServices?: string;
  workforceMode?: WorkforceMode;
  dataProcessing?: DataProcessingChoice;
  specialCompliance?: string;
  governingLaw?: string;
};

export type TemplateSeed = {
  code: string;
  name: string;
  conditional: "transfer" | "additional" | "amendment" | null;
  requiredVariables: string[];
  bodyMarkdown: string;
};

const DRAFT_BANNER =
  "STATUS: DRAFT TEMPLATE. This document is not an executed agreement. It cannot be sent for signature until this template version is approved by Nova. Missing fields are marked Awaiting Information and are not filled with assumed values.";

function draft(title: string, purpose: string, extra: string) {
  return `${DRAFT_BANNER}

# ${title}

${purpose}

Parties
- Client: {{client.legal_name}}
- Client registration number: {{client.registration_number}}
- Client registered address: {{client.registered_address}}
- Client country: {{client.country}}
- Client authorised signatory: {{client.authorised_signatory}}
- Nova contracting entity: {{nova.legal_entity_name}}
- Nova contracting entity address: {{nova.legal_entity_address}}

The commercial client, the Nova contracting entity, the Indian legal employer, and each employee assignment are related records. They are not treated as the same party.

${extra}

Template version: {{agreement.version}}
Governing law: {{agreement.governing_law}}
`;
}

export const LEGAL_TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    code: "MSA",
    name: "Master Employer of Record Services Agreement",
    conditional: null,
    requiredVariables: [
      "client.legal_name",
      "client.registration_number",
      "client.registered_address",
      "client.country",
      "client.authorised_signatory",
      "nova.legal_entity_name",
      "nova.legal_entity_address",
      "agreement.governing_law",
      "agreement.version",
      "commercial.effective_date",
    ],
    bodyMarkdown: draft(
      "Master Employer of Record Services Agreement",
      "Nova will employ designated individuals in India and provide the services described in Schedule B, on the commercial terms in Schedule A, once this agreement is executed.",
      "Effective date: {{commercial.effective_date}}\n\nLiability, indemnity, termination, notice, and breach notification are intentionally omitted from this draft. Counsel must insert the approved clauses before this version can be approved for signature.",
    ),
  },
  {
    code: "SCHEDULE_A",
    name: "Schedule A — Commercial Terms & Pricing",
    conditional: null,
    requiredVariables: [
      "client.legal_name",
      "commercial.plan",
      "commercial.monthly_fee",
      "commercial.currency",
      "commercial.payment_terms",
      "commercial.effective_date",
      "agreement.version",
    ],
    bodyMarkdown: draft(
      "Schedule A — Commercial Terms & Pricing",
      "These commercial terms become contractual only when this schedule is executed and a ClientPricingAgreement is separately approved. Published list prices are not copied into this schedule.",
      "Plan: {{commercial.plan}}\nProposed fee per employee: {{commercial.monthly_fee}} {{commercial.currency}}\nPayment terms: {{commercial.payment_terms}}\nEffective date: {{commercial.effective_date}}",
    ),
  },
  {
    code: "SCHEDULE_B",
    name: "Schedule B — Scope of Services & Responsibilities",
    conditional: null,
    requiredVariables: ["client.legal_name", "commercial.plan", "nova.legal_entity_name", "agreement.version"],
    bodyMarkdown: draft(
      "Schedule B — Scope of Services & Responsibilities",
      "Describes the base EOR scope for the selected plan. Items listed as additional services are outside this schedule.",
      "Selected plan: {{commercial.plan}}\nIndian legal employer proposed for assignments: {{nova.legal_entity_name}}",
    ),
  },
  {
    code: "DPA",
    name: "Data Processing Agreement",
    conditional: null,
    requiredVariables: [
      "client.legal_name",
      "nova.legal_entity_name",
      "agreement.version",
    ],
    bodyMarkdown: draft(
      "Data Processing Agreement",
      "Generated only when personal-data processing is assessed as applicable. Roles, subprocessors, and transfer mechanisms must be completed by counsel. This draft does not state that Nova is certified under any privacy regime.",
      "Applicability is recorded on the onboarding case. If processing is assessed as not required, this document is marked Not applicable and is not treated as a contract.",
    ),
  },
  {
    code: "KYB_CHECKLIST",
    name: "Client KYB & Due Diligence Checklist",
    conditional: null,
    requiredVariables: ["client.legal_name", "client.country", "agreement.version"],
    bodyMarkdown: draft(
      "Client KYB & Due Diligence Checklist",
      "Working checklist for incorporation evidence, signatory authority, and ownership. It is not a KYB approval.",
      "Country of incorporation: {{client.country}}",
    ),
  },
  {
    code: "ONBOARDING_FORM",
    name: "Client Onboarding Information Form",
    conditional: null,
    requiredVariables: ["client.legal_name", "client.country", "agreement.version"],
    bodyMarkdown: draft(
      "Client Onboarding Information Form",
      "Collects the company and representative details required before agreements can be completed.",
      "Trading and contact details are taken from the onboarding profile. Blank fields remain Awaiting Information.",
    ),
  },
  {
    code: "PAYROLL_FUNDING",
    name: "Payroll Funding & Billing Schedule",
    conditional: null,
    requiredVariables: [
      "client.legal_name",
      "commercial.currency",
      "commercial.payment_terms",
      "agreement.version",
    ],
    bodyMarkdown: draft(
      "Payroll Funding & Billing Schedule",
      "States how the client funds Indian payroll and Nova's fee. Funding deadlines are not invented.",
      "Billing currency: {{commercial.currency}}\nPayment terms: {{commercial.payment_terms}}",
    ),
  },
  {
    code: "AUTHORISED_CONTACTS",
    name: "Authorised Representatives & Contacts Schedule",
    conditional: null,
    requiredVariables: ["client.legal_name", "client.authorised_signatory", "agreement.version"],
    bodyMarkdown: draft(
      "Authorised Representatives & Contacts Schedule",
      "Names the people authorised to instruct Nova. An unverified email address is not treated as a verified representative.",
      "Authorised signatory: {{client.authorised_signatory}}",
    ),
  },
  {
    code: "EMPLOYEE_TRANSFER",
    name: "Employee Transfer Schedule",
    conditional: "transfer",
    requiredVariables: ["client.legal_name", "nova.legal_entity_name", "agreement.version"],
    bodyMarkdown: draft(
      "Employee Transfer Schedule",
      "Used only when the client is transferring an existing workforce. Individual employees are listed later and are not invented here.",
      "Receiving Indian employer: {{nova.legal_entity_name}}",
    ),
  },
  {
    code: "ADDITIONAL_SERVICES",
    name: "Additional Services Schedule",
    conditional: "additional",
    requiredVariables: ["client.legal_name", "agreement.version"],
    bodyMarkdown: draft(
      "Additional Services Schedule",
      "Used only when the client has named additional services. Those services are outside Schedule B until this schedule is executed.",
      "The service description is the text supplied on the onboarding profile.",
    ),
  },
  {
    code: "AMENDMENT",
    name: "Contract Amendment Template",
    conditional: "amendment",
    requiredVariables: ["client.legal_name", "nova.legal_entity_name", "agreement.version"],
    bodyMarkdown: draft(
      "Contract Amendment",
      "Available when a change is required after execution. It does not alter an executed agreement by itself.",
      "Describe the clause being replaced. Do not regenerate the executed master agreement.",
    ),
  },
];

const PLAN_LABEL: Record<string, string> = {
  essential: "EOR Essential",
  managed: "EOR Managed",
  enterprise: "EOR Enterprise",
};

export type VariableContext = {
  legalName: string;
  registrationNumber?: string | null;
  countryCode: string;
  profile: OnboardingProfile;
  novaName?: string | null;
  novaAddress?: string | null;
  templateVersion: number;
};

export function resolveVariables(ctx: VariableContext): Record<string, string> {
  const profile = ctx.profile;
  const signatory = [profile.representativeName, profile.representativePosition].filter(Boolean).join(", ");
  const entries: Array<[string, string | undefined | null]> = [
    ["client.legal_name", ctx.legalName],
    ["client.registration_number", ctx.registrationNumber],
    ["client.registered_address", profile.registeredAddress],
    ["client.country", ctx.countryCode],
    ["client.authorised_signatory", signatory],
    ["nova.legal_entity_name", ctx.novaName],
    ["nova.legal_entity_address", ctx.novaAddress],
    ["commercial.plan", profile.planId ? PLAN_LABEL[profile.planId] : undefined],
    ["commercial.monthly_fee", profile.proposedFee],
    ["commercial.currency", undefined],
    ["commercial.payment_terms", profile.paymentTerms],
    ["commercial.effective_date", profile.commencementDate],
    ["agreement.governing_law", profile.governingLaw],
    ["agreement.version", String(ctx.templateVersion)],
  ];
  const out: Record<string, string> = {};
  for (const [key, value] of entries) {
    const trimmed = value?.trim();
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

export function withCurrency(vars: Record<string, string>, currency?: string | null) {
  const trimmed = currency?.trim();
  if (trimmed) vars["commercial.currency"] = trimmed;
  return vars;
}

export function missingRequired(required: string[], vars: Record<string, string>) {
  return required.filter((key) => !vars[key]);
}

export function renderTemplateBody(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{([a-z0-9_.]+)\}\}/gi, (_match, key: string) => {
    return vars[key] ?? `[Awaiting Information: ${key}]`;
  });
}

export function packCodes(profile: OnboardingProfile) {
  const codes = [
    "MSA",
    "SCHEDULE_A",
    "SCHEDULE_B",
    "KYB_CHECKLIST",
    "ONBOARDING_FORM",
    "PAYROLL_FUNDING",
    "AUTHORISED_CONTACTS",
  ];
  if (profile.dataProcessing !== "not_required") codes.push("DPA");
  if (profile.workforceMode === "transfer" || profile.workforceMode === "both") {
    codes.push("EMPLOYEE_TRANSFER");
  }
  if (profile.additionalServices?.trim()) codes.push("ADDITIONAL_SERVICES");
  return codes;
}

const IMMUTABLE = new Set([
  "FULLY_EXECUTED",
  "SENT_FOR_SIGNATURE",
  "PARTIALLY_SIGNED",
  "SUPERSEDED",
  "VOIDED",
]);

export function canRegenerateDraft(status: string) {
  return !IMMUTABLE.has(status);
}

export function executionBlockers(input: {
  status: string;
  templateStatus: string;
  missing: string[];
}) {
  const blockers: string[] = [];
  if (input.status === "FULLY_EXECUTED") blockers.push("already_executed");
  if (input.templateStatus !== "APPROVED") blockers.push("template_not_approved");
  if (input.missing.length) blockers.push("awaiting_information");
  if (!["APPROVED_FOR_SIGNATURE", "SENT_FOR_SIGNATURE", "PARTIALLY_SIGNED"].includes(input.status)) {
    blockers.push("not_approved_for_signature");
  }
  return blockers;
}
