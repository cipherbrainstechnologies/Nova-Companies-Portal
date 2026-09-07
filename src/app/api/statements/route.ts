import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { authorize, apiError } from "@/server/api-helpers";
import { uploadStatement } from "@/server/statements/statement-service";
import { prisma } from "@/server/db";

const uploadSchema = z.object({
  companyId: z.string().min(1),
  bankCode: z.string().max(30).default("AXIS"),
  file: z.instanceof(File),
  // The salary period is mandatory: reconciliation and duplicate prevention are keyed on it.
  salaryYear: z.coerce.number().int().min(2000).max(2999),
  salaryMonth: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser(); const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    await authorize(user, companyId, "statements", "view");
    return NextResponse.json(await prisma.bankStatement.findMany({ where: { companyId }, include: { file: true }, orderBy: { createdAt: "desc" } }));
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser(); const form = await request.formData();
    const body = uploadSchema.parse({
      companyId: form.get("companyId"),
      bankCode: form.get("bankCode") || "AXIS",
      file: form.get("file"),
      salaryYear: form.get("salaryYear"),
      salaryMonth: form.get("salaryMonth"),
    });
    await authorize(user, body.companyId, "statements", "create");
    const statement = await uploadStatement({ actorUserId: user.id, companyId: body.companyId, bankCode: body.bankCode, salaryYear: body.salaryYear, salaryMonth: body.salaryMonth, buffer: Buffer.from(await body.file.arrayBuffer()), mimeType: body.file.type, originalName: body.file.name });
    return NextResponse.json(statement, { status: 201 });
  } catch (error) { return apiError(error); }
}
