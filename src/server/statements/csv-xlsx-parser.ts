import * as XLSX from "xlsx";
import type {
  ParsedStatement,
  ParsedTxn,
  StatementParser,
  StoredFile,
} from "@/server/statements/types";

type Cell = string | number | Date | null | undefined;
type Row = Record<string, Cell>;

const ALIASES = {
  date: ["DATE", "TRANSACTION DATE", "TXN DATE", "TRAN DATE"],
  valueDate: ["VALUE DATE", "VALUEDATE"],
  particulars: ["PARTICULARS", "NARRATION", "DESCRIPTION", "REMARKS"],
  debit: ["DEBIT", "WITHDRAWAL", "DR"],
  credit: ["CREDIT", "DEPOSIT", "CR"],
  balance: ["BALANCE", "RUNNING BALANCE"],
  cheque: ["CHEQUE", "CHEQUE NUMBER", "CHQ NO", "CHQ NUMBER"],
  branch: ["BRANCH", "INITIATING BRANCH"],
} as const;

function key(value: string): string {
  return value.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase();
}

function cell(row: Row, aliases: readonly string[]): Cell {
  return Object.entries(row).find(([name]) => aliases.includes(key(name)))?.[1];
}

function dateValue(value: Cell, field: string, row: number): Date | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  } else {
    const text = String(value).trim();
    const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      const result = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
      if (
        result.getUTCFullYear() === Number(match[3]) &&
        result.getUTCMonth() === Number(match[2]) - 1 &&
        result.getUTCDate() === Number(match[1])
      ) return result;
    } else {
      const timestamp = Date.parse(text);
      if (!Number.isNaN(timestamp)) return new Date(timestamp);
    }
  }
  throw new Error(`Invalid ${field} in spreadsheet row ${row}`);
}

function amount(value: Cell, field: string, row: number): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[₹,\s]/g, "").replace(/\((.+)\)/, "-$1"));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${field} in spreadsheet row ${row}`);
  return parsed === 0 ? undefined : parsed;
}

export function parseCsvXlsxStatement(input: StoredFile, bankCode: string): ParsedStatement {
  const extension = input.originalName.split(".").at(-1)?.toLowerCase();
  if (!["csv", "xlsx", "xls"].includes(extension ?? "")) {
    throw new Error("Only CSV, XLSX, and XLS statement files are supported");
  }
  const workbook = XLSX.read(input.buffer, { type: "buffer", cellDates: true, raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The statement workbook has no worksheets");
  const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], {
    defval: "",
    raw: true,
  });
  const transactions: ParsedTxn[] = [];
  rows.forEach((source, index) => {
    const rowIndex = index + 2;
    const txnDate = dateValue(cell(source, ALIASES.date), "Date", rowIndex);
    const particulars = String(cell(source, ALIASES.particulars) ?? "").trim();
    if (!txnDate && !particulars) return;
    if (!txnDate) throw new Error(`Date is required in spreadsheet row ${rowIndex}`);
    if (!particulars) throw new Error(`Particulars are required in spreadsheet row ${rowIndex}`);
    transactions.push({
      txnDate,
      valueDate: dateValue(cell(source, ALIASES.valueDate), "Value Date", rowIndex),
      particulars,
      debit: amount(cell(source, ALIASES.debit), "Debit", rowIndex),
      credit: amount(cell(source, ALIASES.credit), "Credit", rowIndex),
      balance: amount(cell(source, ALIASES.balance), "Balance", rowIndex),
      chequeNumber: String(cell(source, ALIASES.cheque) ?? "").trim() || undefined,
      branch: String(cell(source, ALIASES.branch) ?? "").trim() || undefined,
      rowIndex,
    });
  });
  if (!transactions.length) throw new Error("The statement contains no transaction rows");
  const dates = transactions.map((transaction) => transaction.txnDate.getTime());
  return {
    bankCode: bankCode.trim().toUpperCase(),
    periodStart: new Date(Math.min(...dates)),
    periodEnd: new Date(Math.max(...dates)),
    parserVersion: "csv-xlsx-v1",
    transactions,
  };
}

export const parseCsvOrXlsx = parseCsvXlsxStatement;

export class CsvXlsxStatementParser implements StatementParser {
  readonly bankCode: string;
  constructor(bankCode: string) {
    this.bankCode = bankCode.trim().toUpperCase();
    if (!this.bankCode) throw new Error("bankCode is required");
  }
  async parse(input: StoredFile): Promise<ParsedStatement> {
    return parseCsvXlsxStatement(input, this.bankCode);
  }
}
