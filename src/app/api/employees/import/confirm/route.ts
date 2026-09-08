import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError } from "@/server/api-helpers";
import { AuthzError } from "@/server/rbac/permissions";
import {
  confirmEmployeeCsvImport,
  listImportableCompanies,
} from "@/server/employees/csv-import";

const confirmSchema = z.object({
  batchId: z.string().min(1),
  decisions: z.array(
    z.object({
      rowNumber: z.number().int().positive(),
      action: z.enum(["create", "update", "skip"]),
      employeeId: z.string().min(1).optional(),
    }),
  ),
  effectiveFrom: z.coerce.date().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "OPERATIONS_MANAGER") {
      throw new AuthzError();
    }
    const body = confirmSchema.parse(await request.json());
    const importable = await listImportableCompanies({
      userId: user.id,
      globalRole: user.globalRole,
    });
    if (!importable.length) throw new AuthzError("No companies available for import");
    return NextResponse.json(
      await confirmEmployeeCsvImport({
        actorUserId: user.id,
        globalRole: user.globalRole,
        ...body,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
