import Decimal from "decimal.js";
import { COMMERCIAL_PLANS } from "@/content/public-site/commercial-plans";

/**
 * Read-only EOR business metrics.
 * Salary reimbursements are never added to EOR service revenue.
 * Amounts stay in their invoice or agreement currency. Nothing is FX-converted here.
 */

const TIMEZONE = "Asia/Kolkata";

const ONBOARDING_STATUSES = new Set([
  "DRAFT",
  "INVITED",
  "KYB_IN_PROGRESS",
  "KYB_REVIEW",
  "CONTRACT_PENDING",
  "SIGNATURE_PENDING",
  "COMPLIANCE_REVIEW",
  "CHANGES_REQUESTED",
]);

const PIPELINE: Array<{ stage: string; statuses: string[] }> = [
  { stage: "Lead", statuses: ["DRAFT", "INVITED"] },
  { stage: "KYB", statuses: ["KYB_IN_PROGRESS", "KYB_REVIEW", "CHANGES_REQUESTED"] },
  { stage: "Legal", statuses: ["CONTRACT_PENDING", "SIGNATURE_PENDING", "COMPLIANCE_REVIEW"] },
  { stage: "Active", statuses: ["ACTIVE"] },
  { stage: "At risk", statuses: ["SUSPENDED", "OFFBOARDING"] },
  { stage: "Closed", statuses: ["CLOSED", "REJECTED"] },
];

const DRAFT_INVOICE_STATES = new Set([
  "FORECAST",
  "CLIENT_APPROVED",
  "INVOICE_DRAFT",
  "FINANCE_APPROVED",
  "VOIDED",
]);

const SETTLED_FUNDING = new Set([
  "PAID",
  "RECEIVED",
  "FUNDED",
  "SETTLED",
  "CANCELLED",
  "CANCELED",
  "VOIDED",
  "RECONCILED",
]);

const CLOSED_HIRE = new Set(["DRAFT", "ACTIVE", "REJECTED", "WITHDRAWN"]);

const SIGNATURE_QUEUE = new Set([
  "APPROVED_FOR_SIGNATURE",
  "SENT_FOR_SIGNATURE",
  "PARTIALLY_SIGNED",
]);

export type PlanCode = "ESSENTIAL" | "MANAGED" | "CUSTOM" | "UNCONTRACTED";

export type MoneyAmount = { currency: string; amount: string };

export type BusinessFilters = {
  clientId?: string;
  countryCode?: string;
  novaCompanyId?: string;
  plan?: PlanCode;
};

export type BusinessSnapshot = {
  asOf: string;
  periodStart: string;
  periodEnd: string;
  year: number;
  month: number;
  companies: Array<{ id: string; name: string; prefix: string }>;
  clients: Array<{
    id: string;
    legalName: string;
    countryCode: string;
    lifecycleStatus: string;
    billingCurrency: string;
    relationshipOwnerLabel: string;
    proposedNovaCompanyId: string | null;
    createdAt: string;
  }>;
  assignments: Array<{
    id: string;
    employeeId: string;
    clientOrganizationId: string;
    novaCompanyId: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string | null;
  }>;
  employees: Array<{
    id: string;
    companyId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    status: string;
    dateOfJoining: string | null;
    dateOfExit: string | null;
  }>;
  pricingAgreements: Array<{
    id: string;
    clientOrganizationId: string;
    version: number;
    currency: string;
    feePerEmployee: string;
    effectiveFrom: string;
    effectiveTo: string | null;
  }>;
  novaAgreements: Array<{
    id: string;
    clientOrganizationId: string;
    novaCompanyId: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    signatureStatus: "NONE" | "PENDING" | "COMPLETED";
  }>;
  invoices: Array<{
    id: string;
    clientOrganizationId: string;
    novaCompanyId: string;
    invoiceNumber: string;
    periodYear: number;
    periodMonth: number;
    currency: string;
    financialState: string;
    subtotal: string;
    taxTotal: string;
    total: string;
    dueAt: string | null;
    lines: Array<{ employeeId: string | null; description: string; lineTotal: string; kind: LineKind }>;
    payments: Array<{ amount: string }>;
    creditNotes: Array<{ amount: string }>;
  }>;
  fundingRequests: Array<{
    id: string;
    clientOrganizationId: string;
    amount: string;
    currency: string;
    status: string;
    dueAt: string | null;
    periodYear: number;
    periodMonth: number;
  }>;
  legalDocuments: Array<{
    id: string;
    clientOrganizationId: string;
    templateCode: string;
    status: string;
  }>;
  hireRequests: Array<{ id: string; clientOrganizationId: string; status: string }>;
  kybDocuments: Array<{
    id: string;
    clientOrganizationId: string;
    category: string;
    expiresAt: string;
  }>;
  lifecycleEvents: Array<{ clientId: string; status: string; createdAt: string }>;
  fxSettlements: Array<{
    id: string;
    clientOrganizationId: string;
    varianceAmount: string | null;
    settledAt: string;
  }>;
};

export type LineKind = "SERVICE_FEE" | "EMPLOYMENT_REIMBURSEMENT" | "OTHER";

export type ActionItem = {
  id: string;
  kind: "invoice" | "agreement" | "kyb" | "onboarding" | "funding" | "renewal" | "hire" | "data-quality";
  title: string;
  detail: string;
  owner: string;
  dueAt: string | null;
  status: string;
  href: string;
  severity: "high" | "medium" | "low";
};

export type RenewalItem = {
  id: string;
  clientId: string;
  clientName: string;
  kind: "pricing" | "master";
  effectiveTo: string;
  bucket: 30 | 60 | 90;
  href: string;
};

export type WorkforceRow = {
  employeeId: string;
  employeeCode: string;
  name: string;
  kind: "CLIENT" | "INTERNAL" | "PENDING" | "ON_HOLD";
  status: string;
  clientId: string | null;
  clientName: string | null;
  novaCompanyId: string;
  novaCompanyName: string;
  assignmentStatus: string | null;
  effectiveFrom: string | null;
  plan: PlanCode | null;
  href: string;
};

export type UnavailableMetric = { status: "unavailable"; reason: string };

export type BusinessOverview = {
  asOf: string;
  timezone: typeof TIMEZONE;
  period: { year: number; month: number };
  filters: BusinessFilters;
  counts: {
    activeClients: number;
    onboardingClients: number;
    activeClientEmployees: number;
    novaInternalEmployees: number | null;
    clientsCreatedThisMonth: number;
    clientsClosedThisMonth: number;
    clientEmployeesJoinedThisMonth: number;
    clientEmployeesExitedThisMonth: number;
    uncontractedActiveEmployees: number;
  };
  eorMrr: MoneyAmount[];
  monthlyBillings: MoneyAmount[];
  monthlyServiceRevenue: MoneyAmount[];
  monthlyEmploymentReimbursements: MoneyAmount[];
  monthlyOtherCharges: MoneyAmount[];
  monthlyTax: MoneyAmount[];
  outstandingReceivables: MoneyAmount[];
  receivablesRequiringAction: number;
  ageing: Array<{ bucket: string; invoiceCount: number; amounts: MoneyAmount[] }>;
  openPayrollFunding: MoneyAmount[];
  grossContribution: UnavailableMetric;
  payrollFundingCoverage: UnavailableMetric;
  fxVariance: { status: "available"; settlementCount: number; incompleteCount: number; amounts: MoneyAmount[] };
  renewals: { within30: number; within60: number; within90: number; items: RenewalItem[] };
  planMix: Array<{ plan: PlanCode; clients: number; employees: number; mrr: MoneyAmount[] }>;
  pipeline: Array<{ stage: string; count: number }>;
  revenueByCountry: Array<{ countryCode: string; mrr: MoneyAmount[] }>;
  revenueByEntity: Array<{ novaCompanyId: string; name: string; mrr: MoneyAmount[] }>;
  topClients: Array<{
    clientId: string;
    legalName: string;
    countryCode: string;
    employees: number;
    plan: PlanCode;
    mrr: MoneyAmount[];
    href: string;
  }>;
  actions: ActionItem[];
};

const PLAN_ORDER: PlanCode[] = ["ESSENTIAL", "MANAGED", "CUSTOM", "UNCONTRACTED"];

export function catalogueFee(planId: "essential" | "managed"): Decimal | null {
  const plan = COMMERCIAL_PLANS.find((item) => item.id === planId);
  if (plan?.monthlyFeeInr == null) return null;
  return new Decimal(plan.monthlyFeeInr);
}

export function classifyServicePlan(currency: string, feePerEmployee: string): Exclude<PlanCode, "UNCONTRACTED"> {
  if (currency.trim().toUpperCase() !== "INR") return "CUSTOM";
  const fee = new Decimal(feePerEmployee);
  const essential = catalogueFee("essential");
  const managed = catalogueFee("managed");
  if (essential && fee.equals(essential)) return "ESSENTIAL";
  if (managed && fee.equals(managed)) return "MANAGED";
  return "CUSTOM";
}

export function planAt(
  agreements: Array<Pick<BusinessSnapshot["pricingAgreements"][number], "version" | "currency" | "feePerEmployee" | "effectiveFrom" | "effectiveTo">>,
  asOf: Date,
): PlanCode {
  const row = [...agreements]
    .filter(
      (item) =>
        new Date(item.effectiveFrom).getTime() <= asOf.getTime() &&
        (item.effectiveTo == null || new Date(item.effectiveTo).getTime() > asOf.getTime()),
    )
    .sort((a, b) => b.version - a.version)[0];
  return row ? classifyServicePlan(row.currency, row.feePerEmployee) : "UNCONTRACTED";
}

export function planLabel(plan: PlanCode): string {
  if (plan === "ESSENTIAL") return "Essential";
  if (plan === "MANAGED") return "Managed";
  if (plan === "CUSTOM") return "Custom";
  return "No agreement";
}

export function classifyInvoiceLine(input: {
  employeeId: string | null;
  description: string;
  metadata: unknown;
}): LineKind {
  const meta =
    input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : {};
  if (input.employeeId == null && (meta.pricingVersion != null || /platform fee/i.test(input.description))) {
    return "SERVICE_FEE";
  }
  if (input.employeeId != null) return "EMPLOYMENT_REIMBURSEMENT";
  return "OTHER";
}

export function kolkataMonthBounds(year: number, month: number): { start: Date; endExclusive: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, -5, -30, 0, 0));
  const endExclusive = new Date(Date.UTC(year, month, 1, -5, -30, 0, 0));
  return { start, endExclusive };
}

export function businessCalendar(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function resolveAsOf(year: number, month: number, now: Date): Date {
  const end = new Date(kolkataMonthBounds(year, month).endExclusive.getTime() - 1);
  return now.getTime() < end.getTime() ? now : end;
}

export function parseBusinessFilters(search: {
  clientId?: string;
  country?: string;
  entity?: string;
  plan?: string;
}): BusinessFilters {
  const plan = search.plan?.toUpperCase();
  const allowed: PlanCode[] = ["ESSENTIAL", "MANAGED", "CUSTOM", "UNCONTRACTED"];
  return {
    clientId: search.clientId || undefined,
    countryCode: search.country?.trim().toUpperCase() || undefined,
    novaCompanyId: search.entity || undefined,
    plan: allowed.includes(plan as PlanCode) ? (plan as PlanCode) : undefined,
  };
}

export function formatMoneyAmount(amount: MoneyAmount): string {
  const value = Number(amount.amount);
  if (!Number.isFinite(value)) return `${amount.currency} ${amount.amount}`;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: amount.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${amount.currency} ${amount.amount}`;
  }
}

export function formatMoneyList(amounts: MoneyAmount[], empty = "None"): string {
  if (!amounts.length) return empty;
  return amounts.map(formatMoneyAmount).join(" · ");
}

export function buildBusinessOverview(snapshot: BusinessSnapshot, filters: BusinessFilters = {}): BusinessOverview {
  const asOf = new Date(snapshot.asOf);
  const periodStart = new Date(snapshot.periodStart);
  const periodEnd = new Date(snapshot.periodEnd);
  const clients = filterClients(snapshot, filters, asOf);
  const clientIds = new Set(clients.map((client) => client.id));
  const entityId = filters.novaCompanyId;

  const assignments = snapshot.assignments.filter(
    (row) => clientIds.has(row.clientOrganizationId) && (!entityId || row.novaCompanyId === entityId),
  );
  const invoices = snapshot.invoices.filter(
    (row) => clientIds.has(row.clientOrganizationId) && (!entityId || row.novaCompanyId === entityId),
  );
  const inScope = <T extends { clientOrganizationId: string }>(rows: T[]) =>
    rows.filter((row) => clientIds.has(row.clientOrganizationId));

  const pricingByClient = new Map<string, BusinessSnapshot["pricingAgreements"][number] | null>();
  for (const client of clients) {
    pricingByClient.set(client.id, effectivePricing(snapshot.pricingAgreements, client.id, asOf));
  }

  const activeClientIds = new Set(
    clients.filter((client) => client.lifecycleStatus === "ACTIVE").map((client) => client.id),
  );

  const employeesByClient = new Map<string, Set<string>>();
  const entityEmployees = new Map<string, Map<string, Set<string>>>();
  const activeEmployeeIds = new Set<string>();

  for (const assignment of assignments) {
    if (!isOverlapping(assignment, asOf) || assignment.status !== "ACTIVE") continue;
    if (!activeClientIds.has(assignment.clientOrganizationId)) continue;
    activeEmployeeIds.add(assignment.employeeId);
    const set = employeesByClient.get(assignment.clientOrganizationId) ?? new Set<string>();
    set.add(assignment.employeeId);
    employeesByClient.set(assignment.clientOrganizationId, set);
    const byClient = entityEmployees.get(assignment.novaCompanyId) ?? new Map<string, Set<string>>();
    const entitySet = byClient.get(assignment.clientOrganizationId) ?? new Set<string>();
    entitySet.add(assignment.employeeId);
    byClient.set(assignment.clientOrganizationId, entitySet);
    entityEmployees.set(assignment.novaCompanyId, byClient);
  }

  const mrr = new MoneyBag();
  const planBuckets = new Map<PlanCode, { clients: Set<string>; employees: Set<string>; mrr: MoneyBag }>();
  for (const plan of PLAN_ORDER) planBuckets.set(plan, { clients: new Set(), employees: new Set(), mrr: new MoneyBag() });
  const countryMrr = new Map<string, MoneyBag>();
  let uncontractedActiveEmployees = 0;
  const topClients: BusinessOverview["topClients"] = [];
  const actions: ActionItem[] = [];

  for (const client of clients) {
    const agreement = pricingByClient.get(client.id) ?? null;
    const people = employeesByClient.get(client.id) ?? new Set<string>();
    const plan: PlanCode = agreement
      ? classifyServicePlan(agreement.currency, agreement.feePerEmployee)
      : "UNCONTRACTED";
    const bucket = planBuckets.get(plan)!;
    if (client.lifecycleStatus === "ACTIVE") bucket.clients.add(client.id);
    const clientMrr = new MoneyBag();
    if (client.lifecycleStatus === "ACTIVE" && agreement && people.size > 0) {
      const amount = new Decimal(agreement.feePerEmployee).mul(people.size);
      clientMrr.add(agreement.currency, amount);
      mrr.add(agreement.currency, amount);
      bucket.mrr.add(agreement.currency, amount);
      for (const employeeId of people) bucket.employees.add(employeeId);
      const country = countryMrr.get(client.countryCode) ?? new MoneyBag();
      country.add(agreement.currency, amount);
      countryMrr.set(client.countryCode, country);
    } else if (client.lifecycleStatus === "ACTIVE" && !agreement) {
      uncontractedActiveEmployees += people.size;
      for (const employeeId of people) bucket.employees.add(employeeId);
      if (people.size > 0) {
        actions.push({
          id: `uncontracted-${client.id}`,
          kind: "renewal",
          title: `${client.legalName} has active employees and no effective pricing agreement`,
          detail: "EOR MRR excludes these employees. Catalogue prices are not assumed.",
          owner: client.relationshipOwnerLabel,
          dueAt: null,
          status: "UNCONTRACTED",
          href: `/admin/clients/${client.id}`,
          severity: "high",
        });
      }
    }
    if (client.lifecycleStatus === "ACTIVE") {
      topClients.push({
        clientId: client.id,
        legalName: client.legalName,
        countryCode: client.countryCode,
        employees: people.size,
        plan,
        mrr: clientMrr.list(),
        href: `/admin/clients/${client.id}`,
      });
    }
  }

  const entityMrr: BusinessOverview["revenueByEntity"] = [];
  for (const [novaCompanyId, byClient] of entityEmployees) {
    const bag = new MoneyBag();
    for (const [clientId, people] of byClient) {
      const agreement = pricingByClient.get(clientId);
      if (!agreement || !activeClientIds.has(clientId) || people.size === 0) continue;
      bag.add(agreement.currency, new Decimal(agreement.feePerEmployee).mul(people.size));
    }
    const company = snapshot.companies.find((item) => item.id === novaCompanyId);
    entityMrr.push({
      novaCompanyId,
      name: company ? `${company.prefix} · ${company.name}` : novaCompanyId,
      mrr: bag.list(),
    });
  }

  const billings = new MoneyBag();
  const service = new MoneyBag();
  const reimbursements = new MoneyBag();
  const other = new MoneyBag();
  const tax = new MoneyBag();
  const receivables = new MoneyBag();
  const ageing = new Map<string, { invoiceCount: number; amounts: MoneyBag }>();
  for (const bucket of ["Not yet due", "No due date", "1–30 days", "31–60 days", "61–90 days", "91+ days"]) {
    ageing.set(bucket, { invoiceCount: 0, amounts: new MoneyBag() });
  }
  let receivablesRequiringAction = 0;

  for (const invoice of invoices) {
    if (DRAFT_INVOICE_STATES.has(invoice.financialState)) continue;
    const inPeriod = invoice.periodYear === snapshot.year && invoice.periodMonth === snapshot.month;
    if (inPeriod) {
      billings.add(invoice.currency, invoice.total);
      tax.add(invoice.currency, invoice.taxTotal);
      for (const line of invoice.lines) {
        if (line.kind === "SERVICE_FEE") service.add(invoice.currency, line.lineTotal);
        else if (line.kind === "EMPLOYMENT_REIMBURSEMENT") reimbursements.add(invoice.currency, line.lineTotal);
        else other.add(invoice.currency, line.lineTotal);
      }
      const lineSum = invoice.lines.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0));
      const gap = new Decimal(invoice.total).minus(lineSum).minus(invoice.taxTotal);
      if (gap.abs().greaterThan("0.01")) {
        const client = clients.find((item) => item.id === invoice.clientOrganizationId);
        actions.push({
          id: `gap-${invoice.id}`,
          kind: "data-quality",
          title: `${invoice.invoiceNumber} does not reconcile`,
          detail: "Invoice total does not equal lines plus tax. Receivables still use the invoice total.",
          owner: client?.relationshipOwnerLabel ?? "Unassigned",
          dueAt: null,
          status: invoice.financialState,
          href: `/admin/clients/${invoice.clientOrganizationId}`,
          severity: "medium",
        });
      }
    }

    const balance = invoiceBalance(invoice);
    if (balance.lessThanOrEqualTo(0)) continue;
    receivables.add(invoice.currency, balance);
    const bucket = ageingBucket(asOf, invoice.dueAt);
    const slot = ageing.get(bucket)!;
    slot.invoiceCount += 1;
    slot.amounts.add(invoice.currency, balance);
    const days = invoice.dueAt ? daysPastDue(asOf, new Date(invoice.dueAt)) : null;
    const dueSoon = days != null && days >= -7 && days < 1;
    const overdue = days != null && days >= 1;
    const disputed = invoice.financialState === "DISPUTED";
    if (overdue || dueSoon || disputed) {
      receivablesRequiringAction += 1;
      const client = clients.find((item) => item.id === invoice.clientOrganizationId);
      actions.push({
        id: `invoice-${invoice.id}`,
        kind: "invoice",
        title: overdue
          ? `${invoice.invoiceNumber} is overdue`
          : disputed
            ? `${invoice.invoiceNumber} is disputed`
            : `${invoice.invoiceNumber} is due within 7 days`,
        detail: `${formatMoneyAmount({ currency: invoice.currency, amount: balance.toFixed(2) })} outstanding`,
        owner: client?.relationshipOwnerLabel ?? "Unassigned",
        dueAt: invoice.dueAt,
        status: invoice.financialState,
        href: `/admin/clients/${invoice.clientOrganizationId}`,
        severity: overdue || disputed ? "high" : "medium",
      });
    }
  }

  const fundingBag = new MoneyBag();
  for (const request of inScope(snapshot.fundingRequests)) {
    if (SETTLED_FUNDING.has(request.status.toUpperCase())) continue;
    if (new Decimal(request.amount).lessThanOrEqualTo(0)) continue;
    fundingBag.add(request.currency, request.amount);
    const overdue = request.dueAt != null && daysPastDue(asOf, new Date(request.dueAt)) >= 1;
    if (!overdue && !(request.dueAt && daysPastDue(asOf, new Date(request.dueAt)) >= -7)) continue;
    const client = clients.find((item) => item.id === request.clientOrganizationId);
    actions.push({
      id: `funding-${request.id}`,
      kind: "funding",
      title: overdue ? "Payroll funding is past its due date" : "Payroll funding is due within 7 days",
      detail: `${client?.legalName ?? "Client"} · ${formatMoneyAmount({ currency: request.currency, amount: new Decimal(request.amount).toFixed(2) })} · ${request.periodMonth}/${request.periodYear}. This is not cleared cash coverage.`,
      owner: client?.relationshipOwnerLabel ?? "Unassigned",
      dueAt: request.dueAt,
      status: request.status,
      href: `/admin/clients/${request.clientOrganizationId}`,
      severity: overdue ? "high" : "medium",
    });
  }

  const renewals = collectRenewals(snapshot, clients, asOf);
  for (const item of renewals.items) {
    if (item.bucket !== 30) continue;
    actions.push({
      id: `renewal-${item.id}`,
      kind: "renewal",
      title: `${item.clientName} ${item.kind === "pricing" ? "pricing" : "master agreement"} renews within 30 days`,
      detail: `Effective to ${item.effectiveTo.slice(0, 10)}`,
      owner: clients.find((client) => client.id === item.clientId)?.relationshipOwnerLabel ?? "Unassigned",
      dueAt: item.effectiveTo,
      status: "OPEN",
      href: item.href,
      severity: "medium",
    });
  }

  for (const client of clients) {
    if (client.lifecycleStatus === "KYB_REVIEW" || client.lifecycleStatus === "COMPLIANCE_REVIEW") {
      actions.push({
        id: `kyb-${client.id}`,
        kind: "kyb",
        title: `${client.legalName} is waiting on compliance review`,
        detail: client.lifecycleStatus.replaceAll("_", " "),
        owner: client.relationshipOwnerLabel,
        dueAt: null,
        status: client.lifecycleStatus,
        href: `/admin/clients/${client.id}`,
        severity: "high",
      });
    }
    if (
      ONBOARDING_STATUSES.has(client.lifecycleStatus) &&
      client.lifecycleStatus !== "KYB_REVIEW" &&
      client.lifecycleStatus !== "COMPLIANCE_REVIEW"
    ) {
      const missing: string[] = [];
      if (!client.proposedNovaCompanyId) missing.push("Nova employing entity");
      const agreement = snapshot.novaAgreements.find((row) => row.clientOrganizationId === client.id);
      if (!agreement || agreement.signatureStatus !== "COMPLETED") missing.push("executed agreement");
      if (!pricingByClient.get(client.id)) missing.push("pricing agreement");
      if (missing.length) {
        actions.push({
          id: `activation-${client.id}`,
          kind: "onboarding",
          title: `${client.legalName} cannot be activated yet`,
          detail: missing.join(", "),
          owner: client.relationshipOwnerLabel,
          dueAt: null,
          status: client.lifecycleStatus,
          href: `/admin/clients/${client.id}`,
          severity: "medium",
        });
      }
    }
  }

  for (const document of inScope(snapshot.legalDocuments)) {
    if (!SIGNATURE_QUEUE.has(document.status)) continue;
    const client = clients.find((item) => item.id === document.clientOrganizationId);
    actions.push({
      id: `legal-${document.id}`,
      kind: "agreement",
      title: `${client?.legalName ?? "Client"} document is awaiting signature`,
      detail: `${document.templateCode} · ${document.status.replaceAll("_", " ")}`,
      owner: client?.relationshipOwnerLabel ?? "Unassigned",
      dueAt: null,
      status: document.status,
      href: `/admin/clients/${document.clientOrganizationId}`,
      severity: "medium",
    });
  }

  for (const request of inScope(snapshot.hireRequests)) {
    if (CLOSED_HIRE.has(request.status)) continue;
    const client = clients.find((item) => item.id === request.clientOrganizationId);
    actions.push({
      id: `hire-${request.id}`,
      kind: "hire",
      title: `${client?.legalName ?? "Client"} hire request needs review`,
      detail: request.status.replaceAll("_", " "),
      owner: client?.relationshipOwnerLabel ?? "Unassigned",
      dueAt: null,
      status: request.status,
      href: "/admin/hire-requests",
      severity: "low",
    });
  }

  for (const assignment of assignments) {
    if (assignment.status !== "PENDING") continue;
    const client = clients.find((item) => item.id === assignment.clientOrganizationId);
    const employee = snapshot.employees.find((item) => item.id === assignment.employeeId);
    actions.push({
      id: `assign-${assignment.id}`,
      kind: "onboarding",
      title: `${employee ? `${employee.firstName} ${employee.lastName}` : "Employee"} is awaiting onboarding`,
      detail: client?.legalName ?? "Client assignment",
      owner: client?.relationshipOwnerLabel ?? "Unassigned",
      dueAt: assignment.effectiveFrom,
      status: "PENDING",
      href: employee
        ? `/admin/companies/${employee.companyId}/employees/${employee.id}`
        : `/admin/clients/${assignment.clientOrganizationId}`,
      severity: "medium",
    });
  }

  for (const document of inScope(snapshot.kybDocuments)) {
    const days = daysPastDue(asOf, new Date(document.expiresAt));
    if (days < -30) continue;
    const client = clients.find((item) => item.id === document.clientOrganizationId);
    actions.push({
      id: `kyb-doc-${document.id}`,
      kind: "kyb",
      title: days >= 1 ? `${document.category} has expired` : `${document.category} expires within 30 days`,
      detail: client?.legalName ?? "Client",
      owner: client?.relationshipOwnerLabel ?? "Unassigned",
      dueAt: document.expiresAt,
      status: days >= 1 ? "EXPIRED" : "EXPIRING",
      href: `/admin/clients/${document.clientOrganizationId}`,
      severity: days >= 1 ? "high" : "low",
    });
  }

  const fxBag = new MoneyBag();
  let fxCount = 0;
  let fxIncomplete = 0;
  for (const settlement of inScope(snapshot.fxSettlements)) {
    const settledAt = new Date(settlement.settledAt);
    if (settledAt < periodStart || settledAt >= periodEnd) continue;
    fxCount += 1;
    if (settlement.varianceAmount == null) {
      fxIncomplete += 1;
      continue;
    }
    fxBag.add("INR", settlement.varianceAmount);
  }

  const scopedAwayFromInternal = Boolean(filters.clientId || filters.countryCode || filters.plan);
  const engagedEmployeeIds = new Set(
    snapshot.assignments
      .filter((row) => row.status === "ACTIVE" || row.status === "PENDING" || row.status === "ON_HOLD")
      .filter((row) => isOverlapping(row, asOf) || row.status === "PENDING" || row.status === "ON_HOLD")
      .map((row) => row.employeeId),
  );
  const novaInternalEmployees = scopedAwayFromInternal
    ? null
    : snapshot.employees.filter((employee) => {
        if (employee.status !== "ACTIVE") return false;
        if (entityId && employee.companyId !== entityId) return false;
        return !engagedEmployeeIds.has(employee.id);
      }).length;

  const clientEmployeeIds = new Set(
    assignments
      .filter((row) => row.status !== "ENDED")
      .map((row) => row.employeeId),
  );

  const severityRank = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));

  topClients.sort((a, b) => primaryAmount(b.mrr) - primaryAmount(a.mrr) || b.employees - a.employees);

  return {
    asOf: snapshot.asOf,
    timezone: TIMEZONE,
    period: { year: snapshot.year, month: snapshot.month },
    filters,
    counts: {
      activeClients: clients.filter((client) => client.lifecycleStatus === "ACTIVE").length,
      onboardingClients: clients.filter((client) => ONBOARDING_STATUSES.has(client.lifecycleStatus)).length,
      activeClientEmployees: activeEmployeeIds.size,
      novaInternalEmployees,
      clientsCreatedThisMonth: clients.filter((client) => inRange(new Date(client.createdAt), periodStart, periodEnd)).length,
      clientsClosedThisMonth: new Set(
        snapshot.lifecycleEvents
          .filter(
            (event) =>
              clientIds.has(event.clientId) &&
              (event.status === "CLOSED" || event.status === "OFFBOARDING") &&
              inRange(new Date(event.createdAt), periodStart, periodEnd),
          )
          .map((event) => event.clientId),
      ).size,
      clientEmployeesJoinedThisMonth: snapshot.employees.filter(
        (employee) =>
          clientEmployeeIds.has(employee.id) &&
          employee.dateOfJoining != null &&
          inRange(new Date(employee.dateOfJoining), periodStart, periodEnd),
      ).length,
      clientEmployeesExitedThisMonth: snapshot.employees.filter(
        (employee) =>
          clientEmployeeIds.has(employee.id) &&
          employee.dateOfExit != null &&
          inRange(new Date(employee.dateOfExit), periodStart, periodEnd),
      ).length,
      uncontractedActiveEmployees,
    },
    eorMrr: mrr.list(),
    monthlyBillings: billings.list(),
    monthlyServiceRevenue: service.list(),
    monthlyEmploymentReimbursements: reimbursements.list(),
    monthlyOtherCharges: other.list(),
    monthlyTax: tax.list(),
    outstandingReceivables: receivables.list(),
    receivablesRequiringAction,
    ageing: [...ageing.entries()].map(([bucket, slot]) => ({
      bucket,
      invoiceCount: slot.invoiceCount,
      amounts: slot.amounts.list(),
    })),
    openPayrollFunding: fundingBag.list(),
    grossContribution: {
      status: "unavailable",
      reason: "Operating costs are not allocated to EOR clients. Bank-statement profit includes non-EOR activity and is not contribution margin.",
    },
    payrollFundingCoverage: {
      status: "unavailable",
      reason: "Cleared client funding is not stored as a balance. Open funding requests are shown separately and are not treated as covered or short.",
    },
    fxVariance: {
      status: "available",
      settlementCount: fxCount,
      incompleteCount: fxIncomplete,
      amounts: fxBag.list(),
    },
    renewals,
    planMix: PLAN_ORDER.map((plan) => {
      const bucket = planBuckets.get(plan)!;
      return { plan, clients: bucket.clients.size, employees: bucket.employees.size, mrr: bucket.mrr.list() };
    }),
    pipeline: PIPELINE.map((stage) => ({
      stage: stage.stage,
      count: clients.filter((client) => stage.statuses.includes(client.lifecycleStatus)).length,
    })),
    revenueByCountry: [...countryMrr.entries()]
      .map(([countryCode, bag]) => ({ countryCode, mrr: bag.list() }))
      .sort((a, b) => a.countryCode.localeCompare(b.countryCode)),
    revenueByEntity: entityMrr.sort((a, b) => a.name.localeCompare(b.name)),
    topClients,
    actions,
  };
}

export function listWorkforce(snapshot: BusinessSnapshot, filters: BusinessFilters = {}): WorkforceRow[] {
  const asOf = new Date(snapshot.asOf);
  const overviewClients = filterClients(snapshot, filters, asOf);
  const clientIds = new Set(overviewClients.map((client) => client.id));
  const rows: WorkforceRow[] = [];
  const seenClients = new Set<string>();

  for (const assignment of snapshot.assignments) {
    if (!clientIds.has(assignment.clientOrganizationId)) continue;
    if (filters.novaCompanyId && assignment.novaCompanyId !== filters.novaCompanyId) continue;
    if (assignment.status === "ENDED") continue;
    if (assignment.status === "ACTIVE" && !isOverlapping(assignment, asOf)) continue;
    const client = snapshot.clients.find((item) => item.id === assignment.clientOrganizationId);
    const employee = snapshot.employees.find((item) => item.id === assignment.employeeId);
    if (!employee || !client) continue;
    const agreement = effectivePricing(snapshot.pricingAgreements, client.id, asOf);
    const commerciallyActive = assignment.status === "ACTIVE" && client.lifecycleStatus === "ACTIVE" && isOverlapping(assignment, asOf);
    const kind: WorkforceRow["kind"] =
      assignment.status === "ON_HOLD" ? "ON_HOLD" : assignment.status === "PENDING" || !commerciallyActive ? "PENDING" : "CLIENT";
    if (filters.plan) {
      const plan = agreement ? classifyServicePlan(agreement.currency, agreement.feePerEmployee) : "UNCONTRACTED";
      if (plan !== filters.plan) continue;
    }
    seenClients.add(employee.id);
    const company = snapshot.companies.find((item) => item.id === employee.companyId);
    rows.push({
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`,
      kind,
      status: employee.status,
      clientId: client.id,
      clientName: client.legalName,
      novaCompanyId: employee.companyId,
      novaCompanyName: company ? `${company.prefix} · ${company.name}` : employee.companyId,
      assignmentStatus: assignment.status,
      effectiveFrom: assignment.effectiveFrom,
      plan: commerciallyActive
        ? agreement
          ? classifyServicePlan(agreement.currency, agreement.feePerEmployee)
          : "UNCONTRACTED"
        : agreement
          ? classifyServicePlan(agreement.currency, agreement.feePerEmployee)
          : "UNCONTRACTED",
      href: `/admin/companies/${employee.companyId}/employees/${employee.id}`,
    });
  }

  const scoped = Boolean(filters.clientId || filters.countryCode || filters.plan);
  if (!scoped && !filters.plan) {
    for (const employee of snapshot.employees) {
      if (employee.status !== "ACTIVE") continue;
      if (filters.novaCompanyId && employee.companyId !== filters.novaCompanyId) continue;
      if (seenClients.has(employee.id)) continue;
      const engaged = snapshot.assignments.some(
        (row) =>
          row.employeeId === employee.id &&
          row.status !== "ENDED" &&
          (row.status !== "ACTIVE" || isOverlapping(row, asOf)),
      );
      if (engaged) continue;
      const company = snapshot.companies.find((item) => item.id === employee.companyId);
      rows.push({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        kind: "INTERNAL",
        status: employee.status,
        clientId: null,
        clientName: null,
        novaCompanyId: employee.companyId,
        novaCompanyName: company ? `${company.prefix} · ${company.name}` : employee.companyId,
        assignmentStatus: null,
        effectiveFrom: employee.dateOfJoining,
        plan: null,
        href: `/admin/companies/${employee.companyId}/employees/${employee.id}`,
      });
    }
  }

  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

export const METRIC_DEFINITIONS: Array<{ name: string; definition: string }> = [
  {
    name: "Active clients",
    definition: "Client organisations whose lifecycle status is ACTIVE. This uses the existing lifecycle and does not invent a second status.",
  },
  {
    name: "Clients onboarding",
    definition: "Organisations in DRAFT, INVITED, KYB, contract, signature, compliance review, or changes requested.",
  },
  {
    name: "Active client employees",
    definition: "Distinct employees with an ACTIVE assignment overlapping the as-of instant, whose client is ACTIVE. Duplicate assignment rows for the same employee are counted once.",
  },
  {
    name: "Nova internal employees",
    definition: "Employees with status ACTIVE and no PENDING, ON_HOLD, or overlapping ACTIVE client assignment. The schema has no internal-staff flag. Hidden when a client, country, or plan filter is applied.",
  },
  {
    name: "EOR MRR",
    definition: "Open pricing-agreement fee per employee, multiplied by distinct active employees on ACTIVE clients. Fees stay in the agreement currency. Salary reimbursements are excluded. Employees without an effective agreement are uncontracted, not priced at the catalogue rate.",
  },
  {
    name: "Monthly billings",
    definition: "Posted invoice totals for the selected month. Draft, forecast, finance-approved, and voided invoices are excluded. The total includes employment reimbursements, service fees, other charges, and tax.",
  },
  {
    name: "EOR service revenue",
    definition: "Posted invoice lines classified as the platform fee for the selected month. This is the earned service amount, not the payroll funds handled.",
  },
  {
    name: "Outstanding receivables",
    definition: "Posted invoice total minus recorded payments minus credit notes, when the balance is still positive. Drafts and voids are excluded.",
  },
  {
    name: "Gross contribution",
    definition: "Unavailable. Client-level operating costs are not stored, so margin is not estimated.",
  },
  {
    name: "Payroll funding coverage",
    definition: "Unavailable. Open funding requests are listed, but cleared cash is not stored against them.",
  },
  {
    name: "FX variance",
    definition: "Sum of FXSettlement.varianceAmount for settlements in the month, treated as INR because the settlement record stores INR received. Settlements with a null variance are counted as incomplete and omitted from the sum.",
  },
  {
    name: "Renewals",
    definition: "Pricing and master agreements with effectiveTo inside 30, 60, or 90 days. Open-ended agreements with no effectiveTo are excluded rather than assigned a date.",
  },
  {
    name: "Plan",
    definition: "Label for the effective pricing agreement. INR fees equal to the published Essential or Managed catalogue price use those names. Every other fee, including non-INR fees, is Custom. The catalogue is not copied onto the agreement.",
  },
  {
    name: "As of",
    definition: "Asia/Kolkata. The current month uses the request time. A past month uses the last instant of that month. Headcount is not projected into a future month.",
  },
];

function filterClients(snapshot: BusinessSnapshot, filters: BusinessFilters, asOf: Date) {
  return snapshot.clients.filter((client) => {
    if (filters.clientId && client.id !== filters.clientId) return false;
    if (filters.countryCode && client.countryCode.toUpperCase() !== filters.countryCode) return false;
    if (filters.novaCompanyId) {
      const proposed = client.proposedNovaCompanyId === filters.novaCompanyId;
      const assigned = snapshot.assignments.some(
        (row) => row.clientOrganizationId === client.id && row.novaCompanyId === filters.novaCompanyId,
      );
      const billed = snapshot.invoices.some(
        (row) => row.clientOrganizationId === client.id && row.novaCompanyId === filters.novaCompanyId,
      );
      if (!proposed && !assigned && !billed) return false;
    }
    if (filters.plan) {
      const agreement = effectivePricing(snapshot.pricingAgreements, client.id, asOf);
      const plan = agreement ? classifyServicePlan(agreement.currency, agreement.feePerEmployee) : "UNCONTRACTED";
      if (plan !== filters.plan) return false;
    }
    return true;
  });
}

function effectivePricing(
  agreements: BusinessSnapshot["pricingAgreements"],
  clientId: string,
  asOf: Date,
) {
  const rows = agreements
    .filter(
      (row) =>
        row.clientOrganizationId === clientId &&
        new Date(row.effectiveFrom).getTime() <= asOf.getTime() &&
        (row.effectiveTo == null || new Date(row.effectiveTo).getTime() > asOf.getTime()),
    )
    .sort((a, b) => b.version - a.version);
  return rows[0] ?? null;
}

function isOverlapping(
  row: { effectiveFrom: string; effectiveTo: string | null },
  asOf: Date,
) {
  return (
    new Date(row.effectiveFrom).getTime() <= asOf.getTime() &&
    (row.effectiveTo == null || new Date(row.effectiveTo).getTime() > asOf.getTime())
  );
}

function invoiceBalance(invoice: BusinessSnapshot["invoices"][number]) {
  const paid = invoice.payments.reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
  const credits = invoice.creditNotes.reduce((sum, note) => sum.plus(note.amount), new Decimal(0));
  return new Decimal(invoice.total).minus(paid).minus(credits);
}

function daysPastDue(asOf: Date, due: Date) {
  const format = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  const left = Date.parse(`${format(asOf)}T00:00:00Z`);
  const right = Date.parse(`${format(due)}T00:00:00Z`);
  return Math.round((left - right) / 86_400_000);
}

function ageingBucket(asOf: Date, dueAt: string | null) {
  if (!dueAt) return "No due date";
  const days = daysPastDue(asOf, new Date(dueAt));
  if (days < 1) return "Not yet due";
  if (days <= 30) return "1–30 days";
  if (days <= 60) return "31–60 days";
  if (days <= 90) return "61–90 days";
  return "91+ days";
}

function inRange(value: Date, start: Date, end: Date) {
  return value.getTime() >= start.getTime() && value.getTime() < end.getTime();
}

function collectRenewals(
  snapshot: BusinessSnapshot,
  clients: BusinessSnapshot["clients"],
  asOf: Date,
): BusinessOverview["renewals"] {
  const items: RenewalItem[] = [];
  const clientIds = new Set(clients.map((client) => client.id));
  const push = (item: Omit<RenewalItem, "bucket"> & { effectiveTo: string }) => {
    const days = daysPastDue(new Date(item.effectiveTo), asOf);
    if (days < 0 || days > 90) return;
    const bucket: 30 | 60 | 90 = days <= 30 ? 30 : days <= 60 ? 60 : 90;
    items.push({ ...item, bucket });
  };

  for (const agreement of snapshot.pricingAgreements) {
    if (!clientIds.has(agreement.clientOrganizationId) || !agreement.effectiveTo) continue;
    const client = clients.find((item) => item.id === agreement.clientOrganizationId);
    push({
      id: agreement.id,
      clientId: agreement.clientOrganizationId,
      clientName: client?.legalName ?? "Client",
      kind: "pricing",
      effectiveTo: agreement.effectiveTo,
      href: `/admin/clients/${agreement.clientOrganizationId}`,
    });
  }
  for (const agreement of snapshot.novaAgreements) {
    if (!clientIds.has(agreement.clientOrganizationId) || !agreement.effectiveTo) continue;
    const client = clients.find((item) => item.id === agreement.clientOrganizationId);
    push({
      id: agreement.id,
      clientId: agreement.clientOrganizationId,
      clientName: client?.legalName ?? "Client",
      kind: "master",
      effectiveTo: agreement.effectiveTo,
      href: `/admin/clients/${agreement.clientOrganizationId}`,
    });
  }
  items.sort((a, b) => a.effectiveTo.localeCompare(b.effectiveTo));
  return {
    within30: items.filter((item) => item.bucket === 30).length,
    within60: items.filter((item) => item.bucket <= 60).length,
    within90: items.length,
    items,
  };
}

function primaryAmount(amounts: MoneyAmount[]) {
  const inr = amounts.find((amount) => amount.currency === "INR");
  return Number((inr ?? amounts[0])?.amount ?? 0);
}

class MoneyBag {
  private map = new Map<string, Decimal>();

  add(currency: string, amount: string | Decimal) {
    const code = currency.trim().toUpperCase();
    if (!code) return;
    this.map.set(code, (this.map.get(code) ?? new Decimal(0)).plus(amount));
  }

  list(): MoneyAmount[] {
    return [...this.map.entries()]
      .map(([currency, amount]) => ({
        currency,
        amount: amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
      }))
      .filter((row) => !new Decimal(row.amount).isZero())
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }
}
