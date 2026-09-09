import type { EmployeeDocumentFolder } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { storePrivateFile, getSignedDownloadUrl } from "@/server/storage/s3";
import {
  EMPLOYEE_DOCUMENT_FOLDERS,
  type EmployeeDocumentFolderId,
} from "@/lib/employee-document-folders";

export { EMPLOYEE_DOCUMENT_FOLDERS };
export type { EmployeeDocumentFolderId };

export function folderLabel(folder: EmployeeDocumentFolder): string {
  return EMPLOYEE_DOCUMENT_FOLDERS.find((row) => row.id === folder)?.label ?? folder;
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 15 * 1024 * 1024;

export async function listEmployeeDocuments(employeeId: string) {
  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId },
    include: { file: true },
    orderBy: [{ folder: "asc" }, { createdAt: "desc" }],
  });
  return docs.map((doc) => ({
    id: doc.id,
    folder: doc.folder,
    folderLabel: folderLabel(doc.folder),
    title: doc.title || doc.file.originalName,
    originalName: doc.file.originalName,
    mimeType: doc.file.mimeType,
    sizeBytes: doc.file.sizeBytes,
    createdAt: doc.createdAt.toISOString(),
    uploadedById: doc.uploadedById,
  }));
}

export async function uploadEmployeeDocument(input: {
  actorUserId: string;
  companyId: string;
  employeeId: string;
  folder: EmployeeDocumentFolder;
  title?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, companyId: input.companyId },
    select: { id: true, firstName: true, lastName: true, displayName: true, employeeCode: true },
  });
  if (!employee) throw new Error("Employee not found in company scope");

  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error("Unsupported file type. Upload PDF, Word, or image files.");
  }
  if (input.buffer.length > MAX_BYTES) {
    throw new Error("File exceeds the 15 MB upload limit");
  }

  const folderSlug = input.folder.toLowerCase().replace(/_/g, "-");
  const employeeSlug = (employee.displayName || `${employee.firstName}-${employee.lastName}`)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const stored = await storePrivateFile({
    buffer: input.buffer,
    mimeType: input.mimeType,
    originalName: input.fileName,
    prefix: `employees/${input.companyId}/${employee.employeeCode}-${employeeSlug}/${folderSlug}`,
  });

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: employee.id,
      folder: input.folder,
      title: input.title?.trim() || input.fileName,
      fileId: stored.id,
      uploadedById: input.actorUserId,
    },
    include: { file: true },
  });

  await writeAudit({
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    action: "employee.document_upload",
    entityType: "EmployeeDocument",
    entityId: doc.id,
    metadata: { employeeId: employee.id, folder: input.folder, fileName: input.fileName },
  });

  return {
    id: doc.id,
    folder: doc.folder,
    folderLabel: folderLabel(doc.folder),
    title: doc.title || doc.file.originalName,
    originalName: doc.file.originalName,
    mimeType: doc.file.mimeType,
    sizeBytes: doc.file.sizeBytes,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function getEmployeeDocumentDownloadUrl(input: {
  companyId: string;
  employeeId: string;
  documentId: string;
}) {
  const doc = await prisma.employeeDocument.findFirst({
    where: {
      id: input.documentId,
      employeeId: input.employeeId,
      employee: { companyId: input.companyId },
    },
    include: { file: true },
  });
  if (!doc) throw new Error("Document not found");
  const url = await getSignedDownloadUrl(doc.file.storageKey, 180);
  return { url, fileName: doc.file.originalName, mimeType: doc.file.mimeType };
}

export async function deleteEmployeeDocument(input: {
  actorUserId: string;
  companyId: string;
  employeeId: string;
  documentId: string;
}) {
  const doc = await prisma.employeeDocument.findFirst({
    where: {
      id: input.documentId,
      employeeId: input.employeeId,
      employee: { companyId: input.companyId },
    },
  });
  if (!doc) throw new Error("Document not found");
  await prisma.employeeDocument.delete({ where: { id: doc.id } });
  await writeAudit({
    actorUserId: input.actorUserId,
    companyId: input.companyId,
    action: "employee.document_delete",
    entityType: "EmployeeDocument",
    entityId: doc.id,
    metadata: { employeeId: input.employeeId, folder: doc.folder },
  });
  return { ok: true };
}
