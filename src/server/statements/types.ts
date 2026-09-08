export interface StoredFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface ParsedTxn {
  txnDate: Date;
  valueDate?: Date;
  particulars: string;
  debit?: number;
  credit?: number;
  balance?: number;
  chequeNumber?: string;
  branch?: string;
  rowIndex: number;
  /** 1-based PDF page when known. */
  sourcePage?: number;
}

export interface ParsedStatement {
  bankCode: string;
  accountHint?: string;
  accountNumber?: string;
  periodStart?: Date;
  periodEnd?: Date;
  openingBalance?: number;
  statementClosingBalance?: number;
  parserVersion: string;
  transactions: ParsedTxn[];
}

export interface StatementParser {
  bankCode: string;
  parse(input: StoredFile): Promise<ParsedStatement>;
}
