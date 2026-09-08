import { Prisma, type TransactionClassification } from "@prisma/client";
import { sha256Buffer } from "@/server/auth/crypto";
import { prisma } from "@/server/db";
import { generateStatementMatchSuggestions } from "@/server/payroll/matcher-integration";
import { applyAutomaticReconciliation } from "@/server/payroll/reconciliation-automation";
import { statementParseQueue } from "@/server/queue/queues";
import { getObjectBuffer, storePrivateFile } from "@/server/storage/s3";
import { validateStatementBalances } from "@/server/finance/finance-ledger";
import { AxisBankPdfParser } from "@/server/statements/axis-bank-pdf-parser";
import { parseCsvXlsxStatement } from "@/server/statements/csv-xlsx-parser";
import type { StoredFile } from "@/server/statements/types";
import {
  resolveTransactionSalaryPeriod,
  statementTransactionFingerprint,
} from "@/server/statements/transaction-identity";
import { toAmount } from "@/server/payroll/salary-structure";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export interface UploadStatementInput extends StoredFile {
  companyId: string;
  bankCode?: string;
  uploadedById?: string;
  actorUserId?: string;
  /** Optional fallback salary period when a row has no usable bank date. Multi-month files derive period per debit. */
  salaryYear?: number;
  salaryMonth?: number;
}

export async function uploadStatement(input: UploadStatementInput) {
  const bankCode = (input.bankCode ?? "AXIS").trim().toUpperCase();
  const uploadedById = input.uploadedById ?? input.actorUserId;
  if (!bankCode) throw new Error("bankCode is required");
  if (input.salaryYear != null && (input.salaryYear < 2000 || input.salaryYear > 2999)) {
    throw new Error("Salary year is out of range");
  }
  if (input.salaryMonth != null && (input.salaryMonth < 1 || input.salaryMonth > 12)) {
    throw new Error("Salary month must be between 1 and 12");
  }
  if (!input.buffer.length) throw new Error("Statement file is empty");
  if (input.buffer.length > MAX_FILE_BYTES) throw new Error("Statement file exceeds 15 MB");
  if (
    !SUPPORTED_MIME_TYPES.has(input.mimeType) &&
    !/\.(pdf|csv|xlsx|xls)$/i.test(input.originalName)
  ) throw new Error("Unsupported statement file type");

  const checksumSha256 = sha256Buffer(input.buffer);
  const unique = {
    companyId_checksumSha256: { companyId: input.companyId, checksumSha256 },
  };
  const existing = await prisma.bankStatement.findUnique({ where: unique });
  if (existing) return { statement: existing, duplicate: true as const };

  const file = await storePrivateFile({
    buffer: input.buffer,
    mimeType: input.mimeType,
    originalName: input.originalName,
    prefix: `companies/${input.companyId}/statements`,
  });

  let statement;
  try {
    statement = await prisma.$transaction(async (tx) => {
      const created = await tx.bankStatement.create({
        data: {
          companyId: input.companyId,
          bankCode,
          fileId: file.id,
          checksumSha256,
          uploadedById,
          salaryYear: input.salaryYear,
          salaryMonth: input.salaryMonth,
          status: "UPLOADED",
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: uploadedById,
          companyId: input.companyId,
          action: "statement.upload",
          entityType: "BankStatement",
          entityId: created.id,
          metadataJson: {
            bankCode,
            checksumSha256,
            originalName: input.originalName,
            salaryYear: input.salaryYear ?? null,
            salaryMonth: input.salaryMonth ?? null,
          },
        },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.bankStatement.findUniqueOrThrow({ where: unique });
      return { statement: raced, duplicate: true as const };
    }
    throw error;
  }

  // Statement rows are user-facing. Default is inline parse in the web process so
  // uploads do not sit at 0 rows when the BullMQ worker is missing. Opt into queue
  // with STATEMENT_PARSE_VIA_QUEUE=1 once a worker is confirmed running.
  const viaQueue = process.env.STATEMENT_PARSE_VIA_QUEUE === "1";
  if (viaQueue) {
    try {
      await statementParseQueue.add(
        "parse-statement",
        { statementId: statement.id },
        { jobId: `statement-${statement.id}` },
      );
    } catch (error) {
      await prisma.bankStatement.update({
        where: { id: statement.id },
        data: { status: "FAILED", parseError: "Statement parsing could not be queued" },
      });
      throw error;
    }
  } else {
    await parseStatementJob(statement.id);
  }

  const refreshed = await prisma.bankStatement.findUniqueOrThrow({
    where: { id: statement.id },
    include: { _count: { select: { transactions: true } } },
  });
  // Uploading and parsing only create reconciliation data; they never issue payslips.
  return { statement: refreshed, duplicate: false as const };
}

export async function parseStatementJob(statementId: string) {
  const statement = await prisma.bankStatement.findUniqueOrThrow({
    where: { id: statementId },
    include: { file: true },
  });
  await prisma.bankStatement.update({
    where: { id: statementId },
    data: { status: "PARSING", parseError: null },
  });

  try {
    const stored: StoredFile = {
      buffer: await getObjectBuffer(statement.file.storageKey),
      mimeType: statement.file.mimeType,
      originalName: statement.file.originalName,
    };
    const isPdf =
      stored.mimeType === "application/pdf" || stored.originalName.toLowerCase().endsWith(".pdf");
    const parsed = isPdf
      ? await new AxisBankPdfParser().parse(stored)
      : parseCsvXlsxStatement(stored, statement.bankCode);

    const balanceCheck = validateStatementBalances(parsed);

    // Preserve manual classifications across versioned reparses (by fingerprint).
    const priorManual = await prisma.statementTransaction.findMany({
      where: {
        statementId,
        classification: { not: "UNCLASSIFIED" },
        isDuplicate: false,
        fingerprint: { not: null },
      },
      select: { fingerprint: true, classification: true },
    });
    const manualByFingerprint = new Map(
      priorManual
        .filter((row) => row.fingerprint)
        .map((row) => [row.fingerprint!, row.classification]),
    );

    const priorFingerprints = new Set(
      (
        await prisma.statementTransaction.findMany({
          where: {
            statement: { companyId: statement.companyId },
            statementId: { not: statementId },
            isDuplicate: false,
            fingerprint: { not: null },
          },
          select: { fingerprint: true },
        })
      )
        .map((row) => row.fingerprint)
        .filter((fp): fp is string => !!fp),
    );

    const seenInFile = new Set<string>();
    let duplicateCount = 0;

    await prisma.$transaction(async (tx) => {
      await tx.statementTransaction.deleteMany({ where: { statementId } });
      await tx.statementTransaction.createMany({
        data: parsed.transactions.map((transaction) => {
          const fingerprint = statementTransactionFingerprint({
            txnDate: transaction.txnDate,
            particulars: transaction.particulars,
            debit: toAmount(transaction.debit),
            credit: toAmount(transaction.credit),
            chequeNumber: transaction.chequeNumber,
          });
          const period = resolveTransactionSalaryPeriod({
            txnDate: transaction.txnDate,
            valueDate: transaction.valueDate,
            statementSalaryYear: statement.salaryYear,
            statementSalaryMonth: statement.salaryMonth,
          });
          const isDuplicate =
            priorFingerprints.has(fingerprint) || seenInFile.has(fingerprint);
          if (isDuplicate) duplicateCount += 1;
          else seenInFile.add(fingerprint);
          const restored = manualByFingerprint.get(fingerprint);
          const classification: TransactionClassification = isDuplicate
            ? "IGNORE"
            : (restored ?? "UNCLASSIFIED");
          return {
            statementId,
            txnDate: transaction.txnDate,
            valueDate: transaction.valueDate,
            particulars: transaction.particulars,
            debit: transaction.debit,
            credit: transaction.credit,
            balance: transaction.balance,
            chequeNumber: transaction.chequeNumber,
            branch: transaction.branch,
            rowIndex: transaction.rowIndex,
            salaryYear: period?.year ?? null,
            salaryMonth: period?.month ?? null,
            fingerprint,
            isDuplicate,
            classification,
            reconciliationStatus: isDuplicate ? ("IGNORED" as const) : ("UNMATCHED" as const),
            ignoreReason: isDuplicate
              ? "Duplicate debit already present for this company (same date, amount, and narration)"
              : null,
          };
        }),
      });

      const parseNotes: string[] = [];
      if (duplicateCount > 0) {
        parseNotes.push(`Parsed with ${duplicateCount} duplicate row(s) ignored`);
      }
      if (!balanceCheck.statementReconciled && balanceCheck.reconciliationDifference != null) {
        parseNotes.push(
          `Statement reconciliation failed (difference ${balanceCheck.reconciliationDifference})`,
        );
      }

      await tx.bankStatement.update({
        where: { id: statementId },
        data: {
          status: "PARSED",
          accountHint: parsed.accountHint,
          accountNumber: parsed.accountNumber ?? null,
          periodStart: parsed.periodStart,
          periodEnd: parsed.periodEnd,
          openingBalance: balanceCheck.openingBalance,
          statementClosingBalance: balanceCheck.statementClosingBalance,
          calculatedClosingBalance: balanceCheck.calculatedClosingBalance,
          reconciliationDifference: balanceCheck.reconciliationDifference,
          totalCredits: balanceCheck.totalCredits,
          totalDebits: balanceCheck.totalDebits,
          transactionCount: balanceCheck.transactionCount,
          parserVersion: parsed.parserVersion,
          statementReconciled: balanceCheck.statementReconciled,
          parseError: parseNotes.length ? parseNotes.join(" · ").slice(0, 1_000) : null,
        },
      });
    });
    await generateStatementMatchSuggestions({
      companyId: statement.companyId,
      statementId,
    });
    // Records reconciliation decisions only; issuing payslips always stays manual.
    await applyAutomaticReconciliation({
      companyId: statement.companyId,
      statementId,
      actorUserId: statement.uploadedById ?? undefined,
    });
    // Statement import changes month totals — drop stale profit snapshots for this company.
    await prisma.profitReportSnapshot.deleteMany({
      where: { companyId: statement.companyId },
    });
  } catch (error) {
    await prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        status: "FAILED",
        parseError: error instanceof Error ? error.message.slice(0, 1_000) : "Statement parse failed",
      },
    });
    throw error;
  }
}

export async function updateStatementClassification(input: {
  companyId: string;
  transactionId: string;
  classification: TransactionClassification;
  classifiedById?: string;
  notes?: string;
}) {
  const transaction = await prisma.statementTransaction.findFirst({
    where: { id: input.transactionId, statement: { companyId: input.companyId } },
    select: { id: true, statementId: true },
  });
  if (!transaction) throw new Error("Statement transaction not found in company scope");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.statementTransaction.update({
      where: { id: transaction.id },
      data: { classification: input.classification },
    });
    await tx.statementClassification.create({
      data: {
        transactionId: transaction.id,
        classification: input.classification,
        classifiedById: input.classifiedById,
        notes: input.notes,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.classifiedById,
        companyId: input.companyId,
        action: "statement.transaction_classify",
        entityType: "StatementTransaction",
        entityId: transaction.id,
        metadataJson: {
          statementId: transaction.statementId,
          classification: input.classification,
        },
      },
    });
    await tx.profitReportSnapshot.deleteMany({ where: { companyId: input.companyId } });
    return updated;
  });
}

export const classifyTransaction = updateStatementClassification;
