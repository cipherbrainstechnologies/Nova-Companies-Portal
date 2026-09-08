import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { AuthzError } from "@/server/rbac/permissions";
import { previewEmployeeCsv } from "@/server/employees/csv-import";

/** Context company is UI scope only; matching uses all importable companies. */
const fieldsSchema = z.object({ companyId: z.string().min(1).optional() });

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "OPERATIONS_MANAGER") {
      throw new AuthzError();
    }
    const form = await request.formData();
    const { companyId } = fieldsSchema.parse({
      companyId: form.get("companyId") || undefined,
    });
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      throw new Error("A CSV file is required");
    }
    if (file.size > 5 * 1024 * 1024) throw new Error("CSV file must be 5 MB or smaller");
    if (companyId) {
      await authorize(user, companyId, "employees", "create");
    } else if (user.globalRole !== "SUPER_ADMIN") {
      throw new AuthzError("companyId is required");
    }
    return NextResponse.json(
      await previewEmployeeCsv({
        actorUserId: user.id,
        globalRole: user.globalRole,
        contextCompanyId: companyId,
        fileName: file.name,
        csv: await file.text(),
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
