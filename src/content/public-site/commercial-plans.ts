/**
 * Published Nova Workforce service fees for the marketing site.
 * These figures do not replace PublicPricingPlan or the employment-cost estimate API.
 */

export type CommercialPlanId = "essential" | "managed" | "enterprise";

export type ComparisonCell = "included" | "no" | "quoted";

export type CommercialPlan = {
  id: CommercialPlanId;
  name: string;
  monthlyFeeInr: number | null;
  priceDetail: string;
  summary: string;
  cta: string;
  highlights: readonly string[];
};

export const SEPARATE_CHARGES_NOTE =
  "Salaries, employer statutory costs, insurance premiums, FX costs, optional services, and applicable taxes are charged separately as appropriate.";

export const SEPARATE_CHARGES = [
  "Salaries",
  "Employer statutory costs",
  "Insurance premiums",
  "FX costs",
  "Optional services",
  "Applicable taxes",
] as const;

export const COMMERCIAL_PLANS: readonly CommercialPlan[] = [
  {
    id: "essential",
    name: "Essential",
    monthlyFeeInr: 5000,
    priceDetail: "per employee / month",
    summary: "Legal employment in India, with standard onboarding, payroll, and records.",
    cta: "Enquire about Essential",
    highlights: [
      "Indian legal employment",
      "Standard onboarding and employment documentation",
      "Monthly payroll and payslips",
      "Applicable statutory payroll administration",
      "Standard employee records and payroll support",
    ],
  },
  {
    id: "managed",
    name: "Managed",
    monthlyFeeInr: 7500,
    priceDetail: "per employee / month",
    summary: "Everything in Essential, plus ongoing HR administration for the employment.",
    cta: "Enquire about Managed",
    highlights: [
      "Everything in Essential",
      "Ongoing HR administration",
      "Leave and attendance coordination",
      "Employee HR documentation",
      "Probation and exit-process administration",
      "Monthly workforce reporting",
      "Client HR coordination",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyFeeInr: null,
    priceDetail: "scoped in a written quote",
    summary: "A custom quote for larger workforces or more complex arrangements.",
    cta: "Request a custom quote",
    highlights: [
      "Larger workforces",
      "Workforce transfers",
      "Bespoke reporting and services",
      "Complex commercial or operational arrangements",
    ],
  },
];

export const PLAN_COMPARISON: readonly { label: string; cells: Record<CommercialPlanId, ComparisonCell> }[] = [
  { label: "Indian legal employment", cells: { essential: "included", managed: "included", enterprise: "quoted" } },
  { label: "Standard onboarding and employment documentation", cells: { essential: "included", managed: "included", enterprise: "quoted" } },
  { label: "Monthly payroll and payslips", cells: { essential: "included", managed: "included", enterprise: "quoted" } },
  { label: "Applicable statutory payroll administration", cells: { essential: "included", managed: "included", enterprise: "quoted" } },
  { label: "Standard employee records and payroll support", cells: { essential: "included", managed: "included", enterprise: "quoted" } },
  { label: "Ongoing HR administration", cells: { essential: "no", managed: "included", enterprise: "quoted" } },
  { label: "Leave and attendance coordination", cells: { essential: "no", managed: "included", enterprise: "quoted" } },
  { label: "Employee HR documentation", cells: { essential: "no", managed: "included", enterprise: "quoted" } },
  { label: "Probation and exit-process administration", cells: { essential: "no", managed: "included", enterprise: "quoted" } },
  { label: "Monthly workforce reporting", cells: { essential: "no", managed: "included", enterprise: "quoted" } },
  { label: "Client HR coordination", cells: { essential: "no", managed: "included", enterprise: "quoted" } },
  { label: "Larger workforces", cells: { essential: "no", managed: "no", enterprise: "quoted" } },
  { label: "Workforce transfers", cells: { essential: "no", managed: "no", enterprise: "quoted" } },
  { label: "Bespoke reporting and services", cells: { essential: "no", managed: "no", enterprise: "quoted" } },
  { label: "Complex commercial or operational arrangements", cells: { essential: "no", managed: "no", enterprise: "quoted" } },
];

export const COMPARISON_LABEL: Record<ComparisonCell, string> = {
  included: "Included",
  no: "Not included",
  quoted: "Quoted",
};

export function formatMonthlyFee(amount: number | null): string {
  if (amount == null) return "Custom quote";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function planEnquiryHref(planId: CommercialPlanId): string {
  return `/contact?topic=eor&plan=${planId}`;
}

export function planEnquiryMessage(planId: string | null): string | null {
  const plan = COMMERCIAL_PLANS.find((item) => item.id === planId);
  if (!plan) return null;
  if (plan.monthlyFeeInr == null) {
    return "I would like a custom quote for the Enterprise arrangement.";
  }
  return `I would like to enquire about the ${plan.name} plan at ${formatMonthlyFee(plan.monthlyFeeInr)} per employee per month.`;
}

export function publicSiteUrl(): string {
  const raw = process.env.APP_URL?.replace(/\/$/, "") || "https://www.novaworkforce.in";
  return raw;
}
