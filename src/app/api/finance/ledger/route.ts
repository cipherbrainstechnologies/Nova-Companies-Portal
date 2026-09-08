import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { prisma } from "@/server/db";
import {
  buildBankLedgerMonths,
  computeGrowth,
  periodKey,
  type GrowthMetric,
} from "@/server/finance/finance-ledger";
import { money, roundInr } from "@/server/finance/money";
import { computeMonthlyProfit } from "@/server/finance/profit-engine";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const companyId = req.nextUrl.searchParams.get("companyId");
    const metric = (req.nextUrl.searchParams.get("growthMetric") ??
      "earnedProfit") as GrowthMetric;

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }

    if (companyId !== "ALL") {
      await requirePermission({ user, companyId, module: "finance", action: "view" });
    } else if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "OPERATIONS_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companies =
      companyId === "ALL"
        ? await prisma.company.findMany({ orderBy: { name: "asc" } })
        : [await prisma.company.findUniqueOrThrow({ where: { id: companyId } })];

    const companyRows = [];
    for (const company of companies) {
      const statements = await prisma.bankStatement.findMany({
        where: { companyId: company.id, status: "PARSED" },
        include: {
          transactions: {
            where: { isDuplicate: false },
            orderBy: { txnDate: "asc" },
          },
        },
        orderBy: { periodStart: "asc" },
      });

      const openingBalance =
        statements
          .map((s) => (s.openingBalance != null ? Number(s.openingBalance) : null))
          .find((v) => v != null) ?? null;

      const txns = statements.flatMap((s) =>
        s.transactions.map((t) => ({
          txnDate: t.txnDate,
          debit: Number(t.debit ?? 0),
          credit: Number(t.credit ?? 0),
          particulars: t.particulars,
          classification: t.classification,
        })),
      );

      const bankMonths = buildBankLedgerMonths({ openingBalance, transactions: txns });
      const months: Array<{
        year: number;
        month: number;
        period: string;
        opening: number | null;
        credits: number;
        debits: number;
        netCashMovement: number;
        closing: number | null;
        partialMonth: boolean;
        businessRevenue: number;
        businessExpenses: number;
        earnedProfit: number;
        unclassifiedDebit: number;
        unclassifiedCredit: number;
        provisional: boolean;
        status: "OK" | "PROVISIONAL";
        statementReconciled: boolean;
      }> = [];

      for (const bank of bankMonths) {
        const profit = await computeMonthlyProfit({
          companyId: company.id,
          year: bank.year,
          month: bank.month,
          persistSheet: false,
        });
        months.push({
          ...bank,
          period: periodKey(bank.year, bank.month),
          businessRevenue: profit.revenue,
          businessExpenses: profit.businessExpenses,
          earnedProfit: profit.earnedOperatingProfit,
          unclassifiedDebit: profit.unclassified.totalDebit,
          unclassifiedCredit: profit.unclassified.totalCredit,
          provisional: profit.reconciliationStatus !== "COMPLETE",
          status: profit.reconciliationStatus === "COMPLETE" ? "OK" : "PROVISIONAL",
          statementReconciled: statements.every((s) => s.statementReconciled),
        });
      }

      const withGrowth = months.map((row, idx) => {
        const prev = idx > 0 ? months[idx - 1] : null;
        const metricValue = (
          r: (typeof months)[number] | null | undefined,
        ): number | null => {
          if (!r) return null;
          switch (metric) {
            case "businessRevenue":
              return r.businessRevenue;
            case "businessExpenses":
              return r.businessExpenses;
            case "netCashMovement":
              return r.netCashMovement;
            case "closing":
              return r.closing;
            default:
              return r.earnedProfit;
          }
        };
        const growth = computeGrowth(metricValue(row), metricValue(prev), {
          provisional: row.provisional || Boolean(prev?.provisional),
          partialMonth: row.partialMonth,
        });
        return { ...row, growth };
      });

      companyRows.push({
        companyId: company.id,
        companyName: company.name,
        companyPrefix: company.prefix,
        openingBalance,
        closingBalance: withGrowth.at(-1)?.closing ?? null,
        netIncrease:
          openingBalance != null && withGrowth.at(-1)?.closing != null
            ? roundInr(money(withGrowth.at(-1)!.closing!).minus(openingBalance))
            : null,
        months: withGrowth,
        statements: statements.map((s) => ({
          id: s.id,
          bankCode: s.bankCode,
          transactionCount: s.transactionCount ?? s.transactions.length,
          totalCredits: s.totalCredits != null ? Number(s.totalCredits) : null,
          totalDebits: s.totalDebits != null ? Number(s.totalDebits) : null,
          openingBalance: s.openingBalance != null ? Number(s.openingBalance) : null,
          statementClosingBalance:
            s.statementClosingBalance != null ? Number(s.statementClosingBalance) : null,
          calculatedClosingBalance:
            s.calculatedClosingBalance != null ? Number(s.calculatedClosingBalance) : null,
          reconciliationDifference:
            s.reconciliationDifference != null ? Number(s.reconciliationDifference) : null,
          statementReconciled: s.statementReconciled,
          parserVersion: s.parserVersion,
          parseError: s.parseError,
        })),
      });
    }

    return NextResponse.json({
      growthMetric: metric,
      computedAt: new Date().toISOString(),
      companies: companyRows,
    });
  } catch (err) {
    if (err instanceof AuthError || err instanceof AuthzError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
