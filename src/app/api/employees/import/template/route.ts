import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { AuthzError } from "@/server/rbac/permissions";
import { EMPLOYEE_IMPORT_TEMPLATE } from "@/server/employees/csv-import";

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "OPERATIONS_MANAGER") {
      throw new AuthzError();
    }
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    await authorize(user, companyId, "employees", "create");
    return new NextResponse(EMPLOYEE_IMPORT_TEMPLATE, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="employee-import-template.csv"',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
