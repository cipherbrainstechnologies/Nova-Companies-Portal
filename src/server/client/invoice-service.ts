import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/server/db";
import { storePrivateFile } from "@/server/storage/s3";
import { writeClientActivity } from "@/server/client/client-audit";

export async function issueClientInvoice(input: {
  clientOrganizationId: string;
  novaCompanyId: string;
  periodYear: number;
  periodMonth: number;
  currency: string;
  actorUserId: string;
}) {
  const client = await prisma.clientOrganization.findUniqueOrThrow({
    where: { id: input.clientOrganizationId },
  });

  const snapshots = await prisma.employerCostSnapshot.findMany({
    where: {
      clientOrganizationId: input.clientOrganizationId,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
    },
    include: { employee: true },
  });
  if (!snapshots.length) {
    throw new Error("Freeze employer cost snapshots before issuing invoice");
  }

  const pricing = await prisma.clientPricingAgreement.findFirst({
    where: { clientOrganizationId: input.clientOrganizationId, effectiveTo: null },
    orderBy: { version: "desc" },
  });

  let subtotal = new Decimal(0);
  const lines: Array<{
    employeeId: string | null;
    description: string;
    quantity: Decimal;
    unitAmount: Decimal;
    lineTotal: Decimal;
    metadataJson: Record<string, string>;
  }> = [];

  for (const snap of snapshots) {
    const b = snap.breakdownJson as Record<string, string>;
    const total = new Decimal(b.totalEmployerCost ?? "0");
    subtotal = subtotal.plus(total);
    lines.push({
      employeeId: snap.employeeId,
      description: `EOR services — ${snap.employee.employeeCode} ${input.periodMonth}/${input.periodYear}`,
      quantity: new Decimal(1),
      unitAmount: total,
      lineTotal: total,
      metadataJson: { snapshotId: snap.id },
    });
  }

  if (pricing) {
    const feeLine = new Decimal(pricing.feePerEmployee).mul(snapshots.length);
    subtotal = subtotal.plus(feeLine);
    lines.push({
      employeeId: null,
      description: "NOVA EOR platform fee (per employee)",
      quantity: new Decimal(snapshots.length),
      unitAmount: pricing.feePerEmployee,
      lineTotal: feeLine,
      metadataJson: { pricingVersion: String(pricing.version) },
    });
  }

  const taxTotal = new Decimal(0);
  const total = subtotal.plus(taxTotal);
  const invoiceNumber = `INV-${client.slug}-${input.periodYear}${String(input.periodMonth).padStart(2, "0")}`;

  const snapshotJson = {
    clientLegalName: client.legalName,
    period: { year: input.periodYear, month: input.periodMonth },
    lines: lines.map((l) => ({
      description: l.description,
      lineTotal: l.lineTotal.toFixed(2),
    })),
    issuedBy: input.actorUserId,
    issuedAt: new Date().toISOString(),
  };

  const pdfBody = Buffer.from(JSON.stringify(snapshotJson, null, 2), "utf8");
  const pdfSha256 = createHash("sha256").update(pdfBody).digest("hex");
  const stored = await storePrivateFile({
    buffer: pdfBody,
    mimeType: "application/json",
    originalName: `${invoiceNumber}.json`,
    prefix: `clients/${input.clientOrganizationId}/invoices`,
  });

  const invoice = await prisma.clientInvoice.create({
    data: {
      clientOrganizationId: input.clientOrganizationId,
      novaCompanyId: input.novaCompanyId,
      invoiceNumber,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      currency: input.currency,
      financialState: "ISSUED",
      subtotal,
      taxTotal,
      total,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      pdfSha256,
      pdfStorageKey: stored.storageKey,
      snapshotJson,
      lines: {
        create: lines.map((l) => ({
          employeeId: l.employeeId,
          description: l.description,
          quantity: l.quantity,
          unitAmount: l.unitAmount,
          lineTotal: l.lineTotal,
          metadataJson: l.metadataJson as Prisma.InputJsonValue,
        })),
      },
    },
    include: { lines: true },
  });

  await writeClientActivity({
    clientOrganizationId: input.clientOrganizationId,
    actorUserId: input.actorUserId,
    action: "invoice.issued",
    entityType: "ClientInvoice",
    entityId: invoice.id,
    metadata: { invoiceNumber, pdfSha256 },
  });

  return invoice;
}
