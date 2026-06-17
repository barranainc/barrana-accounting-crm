import { toQuickBooksCsv } from "./csv";
import { toQuickBooksOfx } from "./ofx";
import { qbExportWarnings } from "./validate";
import type { QbExportFile, QbExportFormat, QbExportInput, QbExportOptions } from "./types";

// Exporter registry. CSV → QuickBooks Online; QBO/OFX → QuickBooks Desktop.
export function exportToQuickBooks(
  format: QbExportFormat,
  input: QbExportInput,
  options: QbExportOptions = {}
): QbExportFile {
  switch (format) {
    case "csv":
      return toQuickBooksCsv(input, options);
    case "qbo":
      return toQuickBooksOfx(input);
    default:
      throw new Error(`Unsupported QuickBooks export format: ${format}`);
  }
}

export { toQuickBooksCsv, toQuickBooksOfx, qbExportWarnings };
export type {
  CsvDateFormat,
  CsvLayout,
  QbExportFile,
  QbExportFormat,
  QbExportInput,
  QbExportOptions,
  QbExportTransaction,
} from "./types";
