// QuickBooks export — provider-agnostic types.
// Bank-feed style import for both QuickBooks Online (CSV) and Desktop (.QBO/OFX).

export type QbExportFormat = "csv" | "qbo";
export type CsvLayout = "3col" | "4col";
export type CsvDateFormat = "iso" | "us" | "uk";

export interface QbExportTransaction {
  /** DB row id — used as the OFX FITID so re-imports dedupe instead of duplicating. */
  id?: string;
  postedDate: Date | string;
  description: string;
  /** Positive magnitude; `direction` carries the sign. */
  amount: number;
  direction: "DEBIT" | "CREDIT";
}

export interface QbExportInput {
  transactions: QbExportTransaction[];
  kind?: "BANK" | "CREDIT_CARD";
  institution?: string | null;
  accountName?: string | null;
  accountNumberMasked?: string | null;
  currency?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  openingBalance?: number | null;
  closingBalance?: number | null;
}

export interface QbExportOptions {
  /** CSV column layout: 3-col signed Amount (default) or 4-col Credit/Debit. */
  csvLayout?: CsvLayout;
  /** CSV date format (default ISO). OFX dates are always YYYYMMDD per spec. */
  csvDateFormat?: CsvDateFormat;
}

export interface QbExportFile {
  filename: string;
  mimeType: string;
  content: string;
}
