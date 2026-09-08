import type {
  ParsedStatement,
  ParsedTxn,
  StatementParser,
  StoredFile,
} from "@/server/statements/types";

const DATE_SOURCE = String.raw`\d{2}[/-]\d{2}[/-]\d{4}`;
/**
 * Axis Account Statement Report rows: `12 01/04/2025 01/04/2025 NEFT/...`
 * Legacy / flat exports may omit the serial: `01/04/2025 01/04/2025 NEFT/...`
 */
const ROW_START = new RegExp(
  `^\\s*(?:(\\d{1,5})\\s+)?(${DATE_SOURCE})(?:\\s+(${DATE_SOURCE}))?\\s+`,
);
const MONEY = /(?:₹\s*)?-?\d[\d,]*(?:\.\d{1,2})?(?:\s*(?:CR|DR))?/gi;
const PAGE_NOISE =
  /^(?:page\s+\d+|--+|\d+\s+of\s+\d+|s\.?\s*no\.?|transaction|date\s*\(|\(dd\/mm\/yyyy\)|account statement report|tran(?:saction)?\s*date|value\s*date|particulars|debit|credit|amount\s*\(inr\)|balance\s*\(inr\)|cheque|number|branch\s*name|opening balance|closing balance|generated on|axis bank|statement of axis|joint holder|customer no|scheme\s*:|currency\s*:|ifsc code|micr code|ckyc|transaction\s+total|\+\+\+\+|unless the constituent|registered office|branch address|legend\s*:)/i;

/** Footer / summary lines that must end the current transaction block. */
const BLOCK_TERMINATOR =
  /transaction\s+total|closing balance|^\+\+\+\+|end of report|cheque return details/i;

function parseDate(value: string): Date {
  const [day, month, year] = value.split(/[/-]/).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid statement date: ${value}`);
  }
  return date;
}

function parseMoney(value: string): number {
  const amount = Number(value.replace(/[₹,\s]|CR|DR/gi, ""));
  if (!Number.isFinite(amount)) throw new Error(`Invalid statement amount: ${value}`);
  return amount;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function looksLikeCredit(particulars: string, amountToken: string): boolean {
  if (/\bDR\b/i.test(amountToken)) return false;
  if (/\bCR\b/i.test(amountToken)) return true;
  if (/\bCREDIT\s+CARD\b/i.test(particulars)) return false;
  return /\b(?:CREDIT|DEPOSIT|INTEREST PAID|INWARD|INW\b|REVERSAL|REFUND|BY TRANSFER|FOREIGN\s+INR)\b/i.test(
    particulars,
  );
}

function classifyMovement(input: {
  particulars: string;
  amountToken: string;
  amount: number;
  balance: number;
  previousBalance?: number;
}): { debit?: number; credit?: number } {
  const { particulars, amountToken, amount, balance, previousBalance } = input;
  if (previousBalance != null) {
    const asDebit = roundMoney(previousBalance - amount);
    const asCredit = roundMoney(previousBalance + amount);
    if (Math.abs(asDebit - balance) < 0.02) return { debit: amount || undefined };
    if (Math.abs(asCredit - balance) < 0.02) return { credit: amount || undefined };
  }
  if (looksLikeCredit(particulars, amountToken)) return { credit: amount || undefined };
  return { debit: amount || undefined };
}

function parseRow(
  block: string,
  rowIndex: number,
  previousBalance?: number,
): (ParsedTxn & { balance?: number }) | undefined {
  const compact = block.replace(/\r/g, "").replace(/\n+/g, " ").trim();
  const start = compact.match(ROW_START);
  if (!start) return undefined;

  const txnDateToken = start[2];
  const valueDateToken = start[3];
  const body = compact.slice(start[0].length);
  const allMoneyMatches = [...body.matchAll(MONEY)];
  const formattedMoneyMatches = allMoneyMatches.filter((match) => {
    const token = match[0].replace(/\s*(?:CR|DR)$/i, "");
    return token.includes(",") || token.includes(".") || /\s(?:CR|DR)$/i.test(match[0]);
  });
  // Prefer formatted amounts; drop trailing SOL branch codes like (5885).
  // Axis report rows expose at most debit + credit + balance (3 money fields).
  const candidateMatches =
    formattedMoneyMatches.length >= 1 ? formattedMoneyMatches : allMoneyMatches.slice(-3);
  const moneyMatches =
    candidateMatches.length > 3 ? candidateMatches.slice(-3) : candidateMatches;
  if (!moneyMatches.length) return undefined;

  const balanceMatch = moneyMatches.at(-1)!;
  const balance = parseMoney(balanceMatch[0]);
  const movementMatches = moneyMatches.slice(0, -1);
  let debit: number | undefined;
  let credit: number | undefined;

  const firstMoneyIndex = moneyMatches[0].index ?? body.length;
  const prefix = body.slice(0, firstMoneyIndex).trim();
  const columns = prefix.split(/\s*\|\s*|\t+|\s{2,}/).filter(Boolean);
  let particulars = columns[0] ?? "";
  const trailing = columns.slice(1);
  const chequeNumber = trailing.find((part) => /^\d{5,}$/.test(part));
  const branch = trailing.filter((part) => part !== chequeNumber).at(-1);
  particulars = particulars.replace(/\s*\f\s*/g, " ").replace(/\s{2,}/g, " ").trim();

  if (movementMatches.length >= 2) {
    const left = parseMoney(movementMatches.at(-2)![0]);
    const right = parseMoney(movementMatches.at(-1)![0]);
    // Official Axis columns: Debit Amount | Credit Amount | Balance.
    // Empty cells are omitted in text extraction, so two movements usually mean
    // pollution — fall back to balance-delta using the amount nearest the balance.
    if (previousBalance != null) {
      const useRight = classifyMovement({
        particulars: particulars || body,
        amountToken: movementMatches.at(-1)![0],
        amount: right,
        balance,
        previousBalance,
      });
      const useLeft = classifyMovement({
        particulars: particulars || body,
        amountToken: movementMatches.at(-2)![0],
        amount: left,
        balance,
        previousBalance,
      });
      if (useRight.debit || useRight.credit) {
        debit = useRight.debit;
        credit = useRight.credit;
      } else if (useLeft.debit || useLeft.credit) {
        debit = useLeft.debit;
        credit = useLeft.credit;
      } else {
        debit = left || undefined;
        credit = right || undefined;
      }
    } else {
      debit = left || undefined;
      credit = right || undefined;
    }
  } else if (movementMatches.length === 1) {
    const movement = movementMatches[0];
    const amount = parseMoney(movement[0]);
    ({ debit, credit } = classifyMovement({
      particulars: particulars || body,
      amountToken: movement[0],
      amount,
      balance,
      previousBalance,
    }));
  }

  return {
    txnDate: parseDate(txnDateToken),
    valueDate: valueDateToken ? parseDate(valueDateToken) : undefined,
    particulars: particulars || "Unspecified transaction",
    debit,
    credit,
    balance,
    chequeNumber,
    branch,
    rowIndex,
  };
}

function readOpeningBalance(text: string): number | undefined {
  const match = text.match(/Opening Balance:\s*(?:INR\s*)?([₹\d,]+\.\d{2})/i);
  if (!match) return undefined;
  try {
    return parseMoney(match[1]);
  } catch {
    return undefined;
  }
}

export function parseAxisStatementText(text: string): ParsedStatement {
  const normalized = text.replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n");
  const accountMatch = normalized.match(
    /(?:account(?:\s+(?:no|number))?|a\/c)\s*(?:no\.?)?\s*[:\-]?\s*[xX*]*(\d{4,})/i,
  );
  const blocks: string[] = [];
  let current: string[] = [];

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (BLOCK_TERMINATOR.test(line)) {
      if (current.length) blocks.push(current.join("\n"));
      current = [];
      continue;
    }
    if (ROW_START.test(line)) {
      if (current.length) blocks.push(current.join("\n"));
      current = [line];
    } else if (current.length && !PAGE_NOISE.test(line)) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));

  let previousBalance = readOpeningBalance(normalized);
  const transactions: ParsedTxn[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const row = parseRow(blocks[index], index + 1, previousBalance);
    if (!row) continue;
    if (row.balance != null) previousBalance = row.balance;
    transactions.push(row);
  }

  if (!transactions.length) {
    throw new Error("No Axis Bank statement transactions could be parsed");
  }

  const dates = transactions.map((transaction) => transaction.txnDate.getTime());
  return {
    bankCode: "AXIS",
    accountHint: accountMatch?.[1].slice(-4),
    periodStart: new Date(Math.min(...dates)),
    periodEnd: new Date(Math.max(...dates)),
    transactions,
  };
}

type PdfParseModule = {
  default?: unknown;
  PDFParse?: new (options: { data: Uint8Array }) => {
    getText(): Promise<{ text: string }>;
    destroy?(): Promise<void>;
  };
};

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfModule = (await import("pdf-parse")) as PdfParseModule;
  if (typeof pdfModule.default === "function") {
    const result = (await pdfModule.default(buffer)) as { text: string };
    return result.text;
  }
  if (pdfModule.PDFParse) {
    const parser = new pdfModule.PDFParse({ data: new Uint8Array(buffer) });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy?.();
    }
  }
  throw new Error("Unsupported pdf-parse module API");
}

export class AxisBankPdfParser implements StatementParser {
  readonly bankCode = "AXIS";

  async parse(input: StoredFile): Promise<ParsedStatement> {
    if (input.mimeType !== "application/pdf" && !input.originalName.toLowerCase().endsWith(".pdf")) {
      throw new Error("AxisBankPdfParser accepts PDF statements only");
    }
    return parseAxisStatementText(await extractPdfText(input.buffer));
  }
}
