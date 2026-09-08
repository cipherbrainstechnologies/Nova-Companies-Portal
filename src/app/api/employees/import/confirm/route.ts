import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { AuthzError } from "@/server/rbac/permissions";
import { confirmEmployeeCsvImport } from "@/server/employees/csv-import";

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
    const batch = await prisma.employeeImportBatch.findUniqueOrThrow({
      where: { id: body.batchId },
      select: { companyId: true },
    });
    if (!batch.companyId) throw new Error("Import batch has no company scope");
    await authorize(user, batch.companyId, "employees", "create");
    return NextResponse.json(
      await confirmEmployeeCsvImport({ actorUserId: user.id, ...body }),
    );
  } catch (error) {
    return apiError(error);
  }
}
