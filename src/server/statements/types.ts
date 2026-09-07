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
}

export interface ParsedStatement {
  bankCode: string;
  accountHint?: string;
  periodStart?: Date;
  periodEnd?: Date;
  transactions: ParsedTxn[];
}

export interface StatementParser {
  bankCode: string;
  parse(input: StoredFile): Promise<ParsedStatement>;
}
