import { prisma } from "@/server/db";
import {
  businessCalendar,
  classifyInvoiceLine,
  kolkataMonthBounds,
  resolveAsOf,
  type BusinessSnapshot,
} from "@/server/admin/business-metrics";

function money(value: { toString(): string } | string | null | undefined): string {
  if (value == null) return "0.00";
  return value.toString();
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export async function loadBusinessSnapshot(input: {
  year: number;
  month: number;
  now?: Date;
}): Promise<BusinessSnapshot> {
  const now = input.now ?? new Date();
  const bounds = kolkataMonthBounds(input.year, input.month);
  const asOf = resolveAsOf(input.year, input.month, now);
  const expiryHorizon = new Date(asOf.getTime() + 120 * 86_400_000);

  const [companies, clients, assignments, employees, pricingAgreements, novaAgreements, invoices, fundingRequests, legalDocuments, hireRequests, kybDocuments, lifecycleAudits, fxSettlements] =
    await Promise.all([
      prisma.company.findMany({ select: { id: true, name: true, prefix: true }, orderBy: { prefix: "asc" } }),
      prisma.clientOrganization.findMany({
        select: {
          id: true,
          legalName: true,
          countryCode: true,
          lifecycleStatus: true,
          billingCurrency: true,
          relationshipOwnerId: true,
          proposedNovaCompanyId: true,
          createdAt: true,
        },
      }),
      prisma.employmentAssignment.findMany({
        select: {
          id: true,
          employeeId: true,
          clientOrganizationId: true,
          novaCompanyId: true,
          status: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      }),
      prisma.employee.findMany({
        select: {
          id: true,
          companyId: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          status: true,
          dateOfJoining: true,
          dateOfExit: true,
        },
      }),
      prisma.clientPricingAgreement.findMany({
        select: {
          id: true,
          clientOrganizationId: true,
          version: true,
          currency: true,
          feePerEmployee: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      }),
      prisma.novaEntityClientAgreement.findMany({
        select: {
          id: true,
          clientOrganizationId: true,
          novaCompanyId: true,
          effectiveFrom: true,
          effectiveTo: true,
          signatureEnvelopes: { select: { status: true } },
        },
      }),
      prisma.clientInvoice.findMany({
        where: { financialState: { not: "FORECAST" } },
        select: {
          id: true,
          clientOrganizationId: true,
          novaCompanyId: true,
          invoiceNumber: true,
          periodYear: true,
          periodMonth: true,
          currency: true,
          financialState: true,
          subtotal: true,
          taxTotal: true,
          total: true,
          dueAt: true,
          issuedAt: true,
          lines: { select: { employeeId: true, description: true, lineTotal: true, metadataJson: true } },
          payments: { select: { amount: true, receivedAt: true } },
          creditNotes: { select: { amount: true, issuedAt: true } },
        },
      }),
      prisma.payrollFundingRequest.findMany({
        select: {
          id: true,
          clientOrganizationId: true,
          amount: true,
          currency: true,
          status: true,
          dueAt: true,
          periodYear: true,
          periodMonth: true,
        },
      }),
      prisma.clientLegalDocument.findMany({
        select: { id: true, clientOrganizationId: true, templateCode: true, status: true },
      }),
      prisma.hireRequest.findMany({ select: { id: true, clientOrganizationId: true, status: true } }),
      prisma.clientKYBDocument.findMany({
        where: { expiresAt: { not: null, lte: expiryHorizon } },
        select: {
          id: true,
          category: true,
          expiresAt: true,
          onboardingCase: { select: { clientOrganizationId: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          action: "client.lifecycle",
          createdAt: { gte: bounds.start, lt: bounds.endExclusive },
        },
        select: { entityId: true, metadataJson: true, createdAt: true },
      }),
      prisma.fXSettlement.findMany({
        where: { settledAt: { gte: bounds.start, lt: bounds.endExclusive } },
        select: { id: true, clientOrganizationId: true, varianceAmount: true, inrReceived: true, settledAt: true },
      }),
    ]);

  const ownerIds = [...new Set(clients.map((client) => client.relationshipOwnerId).filter((id): id is string => Boolean(id)))];
  const owners = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, email: true, phone: true },
      })
    : [];
  const ownerLabel = new Map(owners.map((owner) => [owner.id, owner.email ?? owner.phone ?? owner.id]));

  return {
    asOf: asOf.toISOString(),
    periodStart: bounds.start.toISOString(),
    periodEnd: bounds.endExclusive.toISOString(),
    year: input.year,
    month: input.month,
    companies,
    clients: clients.map((client) => ({
      id: client.id,
      legalName: client.legalName,
      countryCode: client.countryCode,
      lifecycleStatus: client.lifecycleStatus,
      billingCurrency: client.billingCurrency,
      relationshipOwnerLabel: client.relationshipOwnerId
        ? (ownerLabel.get(client.relationshipOwnerId) ?? "Unassigned")
        : "Unassigned",
      proposedNovaCompanyId: client.proposedNovaCompanyId,
      createdAt: client.createdAt.toISOString(),
    })),
    assignments: assignments.map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      clientOrganizationId: row.clientOrganizationId,
      novaCompanyId: row.novaCompanyId,
      status: row.status,
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: iso(row.effectiveTo),
    })),
    employees: employees.map((employee) => ({
      id: employee.id,
      companyId: employee.companyId,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      status: employee.status,
      dateOfJoining: iso(employee.dateOfJoining),
      dateOfExit: iso(employee.dateOfExit),
    })),
    pricingAgreements: pricingAgreements.map((row) => ({
      id: row.id,
      clientOrganizationId: row.clientOrganizationId,
      version: row.version,
      currency: row.currency,
      feePerEmployee: money(row.feePerEmployee),
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: iso(row.effectiveTo),
    })),
    novaAgreements: novaAgreements.map((row) => ({
      id: row.id,
      clientOrganizationId: row.clientOrganizationId,
      novaCompanyId: row.novaCompanyId,
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: iso(row.effectiveTo),
      signatureStatus: row.signatureEnvelopes.some((envelope) => envelope.status === "COMPLETED")
        ? "COMPLETED"
        : row.signatureEnvelopes.length
          ? "PENDING"
          : "NONE",
    })),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      clientOrganizationId: invoice.clientOrganizationId,
      novaCompanyId: invoice.novaCompanyId,
      invoiceNumber: invoice.invoiceNumber,
      periodYear: invoice.periodYear,
      periodMonth: invoice.periodMonth,
      currency: invoice.currency,
      financialState: invoice.financialState,
      subtotal: money(invoice.subtotal),
      taxTotal: money(invoice.taxTotal),
      total: money(invoice.total),
      dueAt: iso(invoice.dueAt),
      issuedAt: iso(invoice.issuedAt),
      lines: invoice.lines.map((line) => ({
        employeeId: line.employeeId,
        description: line.description,
        lineTotal: money(line.lineTotal),
        kind: classifyInvoiceLine({
          employeeId: line.employeeId,
          description: line.description,
          metadata: line.metadataJson,
        }),
      })),
      payments: invoice.payments.map((payment) => ({ amount: money(payment.amount), receivedAt: payment.receivedAt.toISOString() })),
      creditNotes: invoice.creditNotes.map((note) => ({ amount: money(note.amount), issuedAt: note.issuedAt.toISOString() })),
    })),
    fundingRequests: fundingRequests.map((row) => ({
      id: row.id,
      clientOrganizationId: row.clientOrganizationId,
      amount: money(row.amount),
      currency: row.currency,
      status: row.status,
      dueAt: iso(row.dueAt),
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
    })),
    legalDocuments: legalDocuments.map((row) => ({
      id: row.id,
      clientOrganizationId: row.clientOrganizationId,
      templateCode: row.templateCode,
      status: row.status,
    })),
    hireRequests,
    kybDocuments: kybDocuments.flatMap((row) =>
      row.expiresAt
        ? [
            {
              id: row.id,
              clientOrganizationId: row.onboardingCase.clientOrganizationId,
              category: row.category,
              expiresAt: row.expiresAt.toISOString(),
            },
          ]
        : [],
    ),
    lifecycleEvents: lifecycleAudits.flatMap((row) => {
      const status =
        row.metadataJson && typeof row.metadataJson === "object" && !Array.isArray(row.metadataJson)
          ? (row.metadataJson as { status?: unknown }).status
          : null;
      if (!row.entityId || typeof status !== "string") return [];
      return [{ clientId: row.entityId, status, createdAt: row.createdAt.toISOString() }];
    }),
    fxSettlements: fxSettlements.map((row) => ({
      id: row.id,
      clientOrganizationId: row.clientOrganizationId,
      varianceAmount: row.varianceAmount == null ? null : money(row.varianceAmount),
      inrReceived: money(row.inrReceived),
      settledAt: row.settledAt.toISOString(),
    })),
  };
}

export function reportingPeriod(search: { year?: string; month?: string }, now = new Date()) {
  const calendar = businessCalendar(now);
  const year = Number(search.year);
  const month = Number(search.month);
  return {
    year: Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : calendar.year,
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : calendar.month,
  };
}
