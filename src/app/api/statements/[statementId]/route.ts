import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { assertCompanyScope } from "@/server/rbac/permissions";
import { prisma } from "@/server/db";

export async function GET(request: Request, { params }: { params: Promise<{ statementId: string }> }) {
  try {
    const user = await requireSessionUser(); const { statementId } = await params;
    const requestedCompanyId = new URL(request.url).searchParams.get("companyId") ?? "";
    await authorize(user, requestedCompanyId, "statements", "view");
    const statement = await prisma.bankStatement.findUniqueOrThrow({ where: { id: statementId }, include: { file: true, transactions: { include: { matchSuggestions: true }, orderBy: { rowIndex: "asc" } } } });
    assertCompanyScope(statement.companyId, requestedCompanyId);
    return NextResponse.json(statement);
  } catch (error) { return apiError(error); }
}
