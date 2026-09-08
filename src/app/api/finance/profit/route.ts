import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { AuthError, AuthzError, requirePermission } from "@/server/rbac/permissions";
import { computeMonthlyProfit } from "@/server/finance/profit-engine";

export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const companyId = req.nextUrl.searchParams.get("companyId");
    const year = Number(req.nextUrl.searchParams.get("year"));
    const month = Number(req.nextUrl.searchParams.get("month"));
    if (!companyId || !year || !month) {
      return NextResponse.json({ error: "companyId, year, month required" }, { status: 400 });
    }
    await requirePermission({ user, companyId, module: "finance", action: "view" });
    const profit = await computeMonthlyProfit({ companyId, year, month, persistSheet: true });
    return NextResponse.json({
      profit: {
        company: profit.companyName,
        companyId: profit.companyId,
        companyPrefix: profit.companyPrefix,
        companyName: profit.companyName,
        period: profit.period,
        revenue: profit.revenue,
        bankPaidSalaries: profit.bankPaidSalaries,
        overtime: profit.overtime,
        salariesOvertime: profit.salariesOvertime,
        salaryRelatedCashPayments: profit.salaryRelatedCashPayments,
        cashSalaryPayments: profit.cashSalaryPayments,
        cbdtBusinessTax: profit.cbdtBusinessTax,
        cbdtTax: profit.cbdtTax,
        otherBusinessExpenses: profit.otherBusinessExpenses,
        businessExpenses: profit.businessExpenses,
        earnedOperatingProfit: profit.earnedOperatingProfit,
        ownerFinancingOutgoings: profit.ownerFinancingOutgoings,
        profitAfterPersonalFinance: profit.profitAfterPersonalFinance,
        cashRemainingAfterDeductions: profit.cashRemainingAfterDeductions,
        cashRemaining: profit.cashRemaining,
        personalFinancing: profit.personalFinancing,
        unclassified: profit.unclassified,
        reconciliationStatus: profit.reconciliationStatus,
        computedAt: profit.computedAt,
        storagePath: profit.storagePath,
        identities: profit.identities,
        lines: profit.lines,
        bankBalanceLabelForbidden: profit.bankBalanceLabelForbidden,
      },
      labels: {
        earnedOperatingProfit:
          "Actual business credits − bank-paid salaries − overtime − cash salary − CBDT/tax − other mapped business expenses",
        profitAfterPersonalFinance:
          "Earned operating profit − home loan − Bajaj EMI − credit-card payments",
        cashRemainingAfterDeductions:
          "Profit after personal/finance deductions − owner/Love transfers − other identified outflows",
        notProfit:
          "Bank balance, opening/closing balances, internal transfers, and unclassified amounts are never earned profit",
      },
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
