import type {
  ParsedStatement,
  ParsedTxn,
  StatementParser,
  StoredFile,
} from "@/server/statements/types";

const DATE_SOURCE = String.raw`\d{2}[/-]\d{2}[/-]\d{4}`;
const ROW_START = new RegExp(`^\\s*(${DATE_SOURCE})(?:\\s+(${DATE_SOURCE}))?\\s+`);
const MONEY = /(?:₹\s*)?-?\d[\d,]*(?:\.\d{1,2})?(?:\s*(?:CR|DR))?/gi;
const PAGE_NOISE =
  /^(?:page\s+\d+|account statement report|tran(?:saction)? date|value date|particulars|opening balance|closing balance|generated on|axis bank)/i;

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

function looksLikeCredit(particulars: string, amountToken: string): boolean {
  if (/\bDR\b/i.test(amountToken)) return false;
  if (/\bCR\b/i.test(amountToken)) return true;
  if (/\bCREDIT\s+CARD\b/i.test(particulars)) return false;
  return /\b(?:CREDIT|DEPOSIT|INTEREST PAID|INWARD|REVERSAL|REFUND|BY TRANSFER)\b/i.test(
    particulars,
  );
}

function parseRow(block: string, rowIndex: number): ParsedTxn | undefined {
  const compact = block.replace(/\r/g, "").replace(/\n+/g, " ").trim();
  const start = compact.match(ROW_START);
  if (!start) return undefined;

  const body = compact.slice(start[0].length);
  const allMoneyMatches = [...body.matchAll(MONEY)];
  const formattedMoneyMatches = allMoneyMatches.filter((match) => {
    const token = match[0].replace(/\s*(?:CR|DR)$/i, "");
    return token.includes(",") || token.includes(".") || /\s(?:CR|DR)$/i.test(match[0]);
  });
  // Plain integer amounts are accepted, but only from the row tail so numeric
  // references inside a narration cannot displace the transaction amount.
  const moneyMatches =
    formattedMoneyMatches.length >= 2 ? formattedMoneyMatches : allMoneyMatches.slice(-2);
  if (!moneyMatches.length) return undefined;

  const balanceMatch = moneyMatches.at(-1)!;
  const balance = parseMoney(balanceMatch[0]);
  const movementMatches = moneyMatches.slice(0, -1);
  let debit: number | undefined;
  let credit: number | undefined;

  if (movementMatches.length >= 2) {
    debit = parseMoney(movementMatches.at(-2)![0]) || undefined;
    credit = parseMoney(movementMatches.at(-1)![0]) || undefined;
  } else if (movementMatches.length === 1) {
    const movement = movementMatches[0];
    if (looksLikeCredit(body, movement[0])) credit = parseMoney(movement[0]);
    else debit = parseMoney(movement[0]);
  }

  const firstMoneyIndex = moneyMatches[0].index ?? body.length;
  const prefix = body.slice(0, firstMoneyIndex).trim();
  const columns = prefix.split(/\s*\|\s*|\t+|\s{2,}/).filter(Boolean);
  let particulars = columns[0] ?? "";
  const trailing = columns.slice(1);
  const chequeNumber = trailing.find((part) => /^\d{5,}$/.test(part));
  const branch = trailing.filter((part) => part !== chequeNumber).at(-1);
  particulars = particulars.replace(/\s*\f\s*/g, " ").replace(/\s{2,}/g, " ").trim();

  return {
    txnDate: parseDate(start[1]),
    valueDate: start[2] ? parseDate(start[2]) : undefined,
    particulars: particulars || "Unspecified transaction",
    debit,
    credit,
    balance,
    chequeNumber,
    branch,
    rowIndex,
  };
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
    if (ROW_START.test(line)) {
      if (current.length) blocks.push(current.join("\n"));
      current = [line];
    } else if (current.length && line && !PAGE_NOISE.test(line)) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n"));

  const transactions = blocks
    .map((block, index) => parseRow(block, index + 1))
    .filter((row): row is ParsedTxn => row !== undefined);
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
