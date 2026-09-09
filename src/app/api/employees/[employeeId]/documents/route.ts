import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/server/auth/session";
import { apiError, authorizeAny } from "@/server/api-helpers";
import {
  deleteEmployeeDocument,
  getEmployeeDocumentDownloadUrl,
  listEmployeeDocuments,
  uploadEmployeeDocument,
} from "@/server/employees/employee-documents";

const folderSchema = z.enum(["OFFER_AND_CONTRACT", "KYC_AND_DOCUMENTS", "SALARY_SLIPS"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const companyId = new URL(request.url).searchParams.get("companyId");
    if (!companyId) throw new Error("companyId is required");
    await authorizeAny(user, companyId, [
      ["employees", "view"],
      ["employees", "edit"],
    ]);
    const documents = await listEmployeeDocuments(employeeId);
    return NextResponse.json({ documents });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const form = await request.formData();
    const companyId = String(form.get("companyId") ?? "");
    const folder = folderSchema.parse(String(form.get("folder") ?? ""));
    const title = String(form.get("title") ?? "").trim() || undefined;
    const file = form.get("file");
    if (!companyId) throw new Error("companyId is required");
    if (!(file instanceof File)) throw new Error("A file is required");
    await authorizeAny(user, companyId, [["employees", "edit"]]);

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadEmployeeDocument({
      actorUserId: user.id,
      companyId,
      employeeId,
      folder,
      title,
      fileName: file.name || "document",
      mimeType: file.type || "application/octet-stream",
      buffer,
    });
    return NextResponse.json({ document });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const user = await requireSessionUser();
    const { employeeId } = await params;
    const body = z
      .object({ companyId: z.string().min(1), documentId: z.string().min(1) })
      .parse(await request.json());
    await authorizeAny(user, body.companyId, [["employees", "edit"]]);
    await deleteEmployeeDocument({
      actorUserId: user.id,
      companyId: body.companyId,
      employeeId,
      documentId: body.documentId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
