import type { QbExportFile, QbExportInput, QbExportOptions } from "./types";
import { csvCell, formatCsvDate, money, sanitizeDescription, slugify } from "./format";

/**
 * QuickBooks bank-transaction CSV (QuickBooks Online "Upload transactions";
 * also imports into recent QuickBooks Desktop).
 *
 * Hardened against Intuit's documented import rules:
 * - No currency symbols, no thousands separators, `.` decimal (`-2200.00`).
 * - No running-balance column (it confuses the importer).
 * - Single-line descriptions (multi-line cells break the import).
 * - Zero-amount rows dropped (QuickBooks rejects them).
 * - UTF-8 without BOM; CRLF line endings; RFC-4180 quoting.
 *
 * Layouts:
 * - 3col (default): `Date,Description,Amount` — DEBIT negative, CREDIT positive.
 * - 4col: `Date,Description,Credit,Debit` — split positive columns.
 */
export function toQuickBooksCsv(input: QbExportInput, options: QbExportOptions = {}): QbExportFile {
  const layout = options.csvLayout ?? "3col";
  const fmt = options.csvDateFormat ?? "iso";

  const txns = input.transactions.filter((t) => Math.abs(Number(t.amount) || 0) >= 0.005);

  let header: string;
  let rows: string[];

  if (layout === "4col") {
    header = "Date,Description,Credit,Debit";
    rows = txns.map((t) => {
      const amt = Math.abs(Number(t.amount) || 0);
      const credit = t.direction === "CREDIT" ? money(amt) : "";
      const debit = t.direction === "DEBIT" ? money(amt) : "";
      return [csvCell(formatCsvDate(t.postedDate, fmt)), csvCell(sanitizeDescription(t.description)), credit, debit].join(",");
    });
  } else {
    header = "Date,Description,Amount";
    rows = txns.map((t) => {
      const amt = Math.abs(Number(t.amount) || 0);
      const signed = t.direction === "DEBIT" ? -amt : amt;
      return [csvCell(formatCsvDate(t.postedDate, fmt)), csvCell(sanitizeDescription(t.description)), money(signed)].join(",");
    });
  }

  const content = [header, ...rows].join("\r\n") + "\r\n";
  const name = input.accountName || input.institution || "statement";
  return { filename: `quickbooks-${slugify(name)}.csv`, mimeType: "text/csv", content };
}
