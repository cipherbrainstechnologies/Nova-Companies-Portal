import { describe, expect, it } from "vitest";
import {
  buildBusinessOverview,
  businessCalendar,
  classifyInvoiceLine,
  classifyServicePlan,
  kolkataMonthBounds,
  listWorkforce,
  type BusinessSnapshot,
} from "../src/server/admin/business-metrics";

const AS_OF = "2026-10-13T15:30:00.000Z";

function snapshot(overrides: Partial<BusinessSnapshot> = {}): BusinessSnapshot {
  const base: BusinessSnapshot = {
    asOf: AS_OF,
    periodStart: "2026-09-30T18:30:00.000Z",
    periodEnd: "2026-10-31T18:30:00.000Z",
    year: 2026,
    month: 10,
    companies: [{ id: "nova", name: "Nova Workforce", prefix: "NW" }],
    clients: [
      {
        id: "acme",
        legalName: "Acme Ltd",
        countryCode: "GB",
        lifecycleStatus: "ACTIVE",
        billingCurrency: "GBP",
        relationshipOwnerLabel: "Unassigned",
        proposedNovaCompanyId: "nova",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    assignments: [
      assignment("a1", "emp-1"),
      assignment("a2", "emp-2"),
    ],
    employees: [employee("emp-1"), employee("emp-2"), employee("emp-internal", "ACTIVE")],
    pricingAgreements: [
      {
        id: "price-1",
        clientOrganizationId: "acme",
        version: 1,
        currency: "INR",
        feePerEmployee: "5000.00",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
      },
    ],
    novaAgreements: [],
    invoices: [],
    fundingRequests: [],
    legalDocuments: [],
    hireRequests: [],
    kybDocuments: [],
    lifecycleEvents: [],
    fxSettlements: [],
  };
  return { ...base, ...overrides };
}

function assignment(id: string, employeeId: string, clientOrganizationId = "acme") {
  return {
    id,
    employeeId,
    clientOrganizationId,
    novaCompanyId: "nova",
    status: "ACTIVE",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
  };
}

function employee(id: string, status = "ACTIVE") {
  return {
    id,
    companyId: "nova",
    employeeCode: id.toUpperCase(),
    firstName: id,
    lastName: "Person",
    status,
    dateOfJoining: "2026-01-15T00:00:00.000Z",
    dateOfExit: null,
  };
}

describe("business calendar", () => {
  it("uses Asia/Kolkata month bounds", () => {
    const bounds = kolkataMonthBounds(2026, 10);
    expect(bounds.start.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(bounds.endExclusive.toISOString()).toBe("2026-10-31T18:30:00.000Z");
    expect(businessCalendar(new Date("2026-10-13T19:00:00.000Z"))).toMatchObject({ year: 2026, month: 10, day: 14 });
  });
});

describe("EOR business overview", () => {
  it("keeps salary reimbursements out of EOR MRR and service revenue", () => {
    const overview = buildBusinessOverview(
      snapshot({
        invoices: [
          {
            id: "inv-1",
            clientOrganizationId: "acme",
            novaCompanyId: "nova",
            invoiceNumber: "INV-1",
            periodYear: 2026,
            periodMonth: 10,
            currency: "INR",
            financialState: "ISSUED",
            subtotal: "200000.00",
            taxTotal: "0.00",
            total: "200000.00",
            dueAt: "2026-10-20T00:00:00.000Z",
            issuedAt: "2026-10-01T00:00:00.000Z",
            lines: [
              {
                employeeId: "emp-1",
                description: "EOR services — salary funding",
                lineTotal: "190000.00",
                kind: "EMPLOYMENT_REIMBURSEMENT",
              },
              {
                employeeId: null,
                description: "NOVA EOR platform fee (per employee)",
                lineTotal: "10000.00",
                kind: "SERVICE_FEE",
              },
            ],
            payments: [{ amount: "50000.00", receivedAt: "2026-10-05T00:00:00.000Z" }],
            creditNotes: [],
          },
        ],
      }),
    );

    expect(overview.eorMrr).toEqual([{ currency: "INR", amount: "10000.00" }]);
    expect(overview.monthlyServiceRevenue).toEqual([{ currency: "INR", amount: "10000.00" }]);
    expect(overview.monthlyEmploymentReimbursements).toEqual([{ currency: "INR", amount: "190000.00" }]);
    expect(overview.monthlyBillings).toEqual([{ currency: "INR", amount: "200000.00" }]);
    expect(overview.outstandingReceivables).toEqual([{ currency: "INR", amount: "150000.00" }]);
    expect(overview.counts.activeClientEmployees).toBe(2);
    expect(overview.counts.billableEmployees).toBe(2);
    expect(overview.counts.unclassifiedEmployees).toBe(1);
    expect(overview.overdueReceivables).toEqual([]);
    expect(overview.grossContribution.status).toBe("unavailable");
    expect(overview.payrollFundingCoverage.status).toBe("unavailable");
    expect(overview.fxVariance.status).toBe("none");
  });

  it("does not price uncontracted employees at the catalogue rate", () => {
    const overview = buildBusinessOverview(
      snapshot({
        pricingAgreements: [],
      }),
    );
    expect(overview.eorMrr).toEqual([]);
    expect(overview.counts.uncontractedActiveEmployees).toBe(2);
    expect(overview.actions.some((item) => item.id === "uncontracted-acme")).toBe(true);
  });

  it("counts a duplicated assignment once and keeps currencies apart", () => {
    const overview = buildBusinessOverview(
      snapshot({
        clients: [
          {
            id: "acme",
            legalName: "Acme Ltd",
            countryCode: "GB",
            lifecycleStatus: "ACTIVE",
            billingCurrency: "GBP",
            relationshipOwnerLabel: "Unassigned",
            proposedNovaCompanyId: "nova",
            createdAt: "2026-09-01T00:00:00.000Z",
          },
          {
            id: "beta",
            legalName: "Beta GmbH",
            countryCode: "DE",
            lifecycleStatus: "ACTIVE",
            billingCurrency: "EUR",
            relationshipOwnerLabel: "Unassigned",
            proposedNovaCompanyId: "nova",
            createdAt: "2026-09-02T00:00:00.000Z",
          },
        ],
        assignments: [assignment("a1", "emp-1"), assignment("a1b", "emp-1"), assignment("b1", "emp-1", "beta")],
        pricingAgreements: [
          {
            id: "price-1",
            clientOrganizationId: "acme",
            version: 1,
            currency: "INR",
            feePerEmployee: "5000.00",
            effectiveFrom: "2026-01-01T00:00:00.000Z",
            effectiveTo: "2026-11-01T00:00:00.000Z",
          },
          {
            id: "price-2",
            clientOrganizationId: "beta",
            version: 1,
            currency: "GBP",
            feePerEmployee: "100.00",
            effectiveFrom: "2026-01-01T00:00:00.000Z",
            effectiveTo: null,
          },
        ],
        employees: [employee("emp-1")],
      }),
    );

    expect(overview.counts.activeClientEmployees).toBe(1);
    expect(overview.eorMrr).toEqual([
      { currency: "GBP", amount: "100.00" },
      { currency: "INR", amount: "5000.00" },
    ]);
    expect(classifyServicePlan("GBP", "100.00")).toBe("CUSTOM");
    expect(classifyServicePlan("INR", "7500")).toBe("MANAGED");
    expect(overview.renewals.within30).toBe(1);
  });

  it("ignores void and draft invoices and classifies fee lines", () => {
    expect(
      classifyInvoiceLine({
        employeeId: null,
        description: "NOVA EOR platform fee (per employee)",
        metadata: { pricingVersion: "1" },
      }),
    ).toBe("SERVICE_FEE");
    const overview = buildBusinessOverview(
      snapshot({
        invoices: [
          {
            id: "void",
            clientOrganizationId: "acme",
            novaCompanyId: "nova",
            invoiceNumber: "INV-VOID",
            periodYear: 2026,
            periodMonth: 10,
            currency: "INR",
            financialState: "VOIDED",
            subtotal: "999.00",
            taxTotal: "0.00",
            total: "999.00",
            dueAt: "2026-10-01T00:00:00.000Z",
            issuedAt: null,
            lines: [],
            payments: [],
            creditNotes: [],
          },
        ],
      }),
    );
    expect(overview.monthlyBillings).toEqual([]);
    expect(overview.outstandingReceivables).toEqual([]);
  });

  it("lists an employee with no assignment as unclassified", () => {
    const rows = listWorkforce(snapshot());
    expect(rows.filter((row) => row.kind === "CLIENT")).toHaveLength(2);
    expect(rows.filter((row) => row.kind === "UNASSIGNED")).toHaveLength(1);
    expect(rows.find((row) => row.kind === "UNASSIGNED")?.employeeId).toBe("emp-internal");
  });

  it("uses the pricing agreement effective on the as-of date and keeps overdue balances apart", () => {
    const overview = buildBusinessOverview(
      snapshot({
        pricingAgreements: [
          {
            id: "old",
            clientOrganizationId: "acme",
            version: 1,
            currency: "INR",
            feePerEmployee: "5000.00",
            effectiveFrom: "2026-01-01T00:00:00.000Z",
            effectiveTo: "2026-10-01T00:00:00.000Z",
          },
          {
            id: "current",
            clientOrganizationId: "acme",
            version: 2,
            currency: "INR",
            feePerEmployee: "7500.00",
            effectiveFrom: "2026-10-01T00:00:00.000Z",
            effectiveTo: null,
          },
        ],
        invoices: [
          {
            id: "old-invoice",
            clientOrganizationId: "acme",
            novaCompanyId: "nova",
            invoiceNumber: "INV-OLD",
            periodYear: 2026,
            periodMonth: 9,
            currency: "INR",
            financialState: "ISSUED",
            subtotal: "1000.00",
            taxTotal: "0.00",
            total: "1000.00",
            dueAt: "2026-09-15T00:00:00.000Z",
            issuedAt: "2026-09-01T00:00:00.000Z",
            lines: [
              {
                employeeId: null,
                description: "NOVA EOR platform fee (per employee)",
                lineTotal: "1000.00",
                kind: "SERVICE_FEE",
              },
            ],
            payments: [{ amount: "400.00", receivedAt: "2026-11-02T00:00:00.000Z" }],
            creditNotes: [{ amount: "100.00", issuedAt: "2026-09-10T00:00:00.000Z" }],
          },
        ],
        fxSettlements: [
          {
            id: "fx-1",
            clientOrganizationId: "acme",
            varianceAmount: "25.00",
            inrReceived: "1000.00",
            settledAt: "2026-10-02T00:00:00.000Z",
          },
        ],
        assignments: [assignment("a1", "emp-1"), assignment("a1-overlap", "emp-1")],
        employees: [employee("emp-1")],
      }),
    );

    expect(overview.eorMrr).toEqual([{ currency: "INR", amount: "7500.00" }]);
    expect(overview.serviceFeeTrend.find((point) => point.month === 9)?.amounts).toEqual([
      { currency: "INR", amount: "1000.00" },
    ]);
    expect(overview.overdueReceivables).toEqual([{ currency: "INR", amount: "900.00" }]);
    expect(overview.receivableRows[0]?.payments).toBe("0.00");
    expect(overview.receivableRows[0]?.credits).toBe("100.00");
    expect(overview.monthlyServiceRevenue).toEqual([]);
    expect(overview.fxVariance.status).toBe("unverified");
    expect(overview.insights.some((item) => item.id === "overlap-emp-1")).toBe(true);
  });
});
