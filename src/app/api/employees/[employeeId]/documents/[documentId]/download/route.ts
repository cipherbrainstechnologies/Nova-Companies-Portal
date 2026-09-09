import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorizeAny } from "@/server/api-helpers";
import { getEmployeeDocumentDownloadUrl } from "@/server/employees/employee-documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId, documentId } = await params;
    const companyId = z.string().min(1).parse(new URL(request.url).searchParams.get("companyId"));
    await authorizeAny(user, companyId, [
      ["employees", "view"],
      ["employees", "edit"],
    ]);
    const result = await getEmployeeDocumentDownloadUrl({ companyId, employeeId, documentId });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
