import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/server/db";

export async function createFxQuote(input: {
  clientOrganizationId: string;
  sourceCurrency: string;
  targetCurrency: string;
  referenceRate: string;
  spreadBps: number;
  validForMinutes: number;
}) {
  const quotedAt = new Date();
  const validUntil = new Date(quotedAt.getTime() + input.validForMinutes * 60_000);
  return prisma.fXQuote.create({
    data: {
      clientOrganizationId: input.clientOrganizationId,
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      referenceRate: new Decimal(input.referenceRate),
      spreadBps: input.spreadBps,
      quotedAt,
      validUntil,
      metadataJson: {
        disclaimer: "Indicative until booked; statutory payroll dates override commercial cutoffs.",
      },
    },
  });
}

export function effectiveRate(referenceRate: Decimal, spreadBps: number): Decimal {
  return referenceRate.mul(new Decimal(1).plus(new Decimal(spreadBps).div(10_000)));
}
