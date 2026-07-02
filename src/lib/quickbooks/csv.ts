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
 *
 * When any row was categorised in review, four trailing columns are appended —
 * `Account #,Account,Account Type,Detail Type` (the full Chart-of-Accounts entry:
 * number, exact name, QuickBooks account type and detail type). QuickBooks' upload
 * wizard lets you map or ignore them, so the clean bank feed still imports.
 */
export function toQuickBooksCsv(input: QbExportInput, options: QbExportOptions = {}): QbExportFile {
  const layout = options.csvLayout ?? "3col";
  const fmt = options.csvDateFormat ?? "iso";

  const txns = input.transactions.filter((t) => Math.abs(Number(t.amount) || 0) >= 0.005);

  const withAccounts = txns.some(
    (t) => (t.accountName && t.accountName.trim()) || (t.accountNumber && t.accountNumber.trim())
  );
  const acctCols = (t: (typeof txns)[number]): string =>
    withAccounts
      ? `,${csvCell((t.accountNumber ?? "").trim())},${csvCell((t.accountName ?? "").trim())},${csvCell(
          (t.accountType ?? "").trim()
        )},${csvCell((t.accountDetailType ?? "").trim())}`
      : "";
  const acctHeader = withAccounts ? ",Account #,Account,Account Type,Detail Type" : "";

  let header: string;
  let rows: string[];

  if (layout === "4col") {
    header = "Date,Description,Credit,Debit" + acctHeader;
    rows = txns.map((t) => {
      const amt = Math.abs(Number(t.amount) || 0);
      const credit = t.direction === "CREDIT" ? money(amt) : "";
      const debit = t.direction === "DEBIT" ? money(amt) : "";
      return [csvCell(formatCsvDate(t.postedDate, fmt)), csvCell(sanitizeDescription(t.description)), credit, debit].join(",") + acctCols(t);
    });
  } else {
    header = "Date,Description,Amount" + acctHeader;
    rows = txns.map((t) => {
      const amt = Math.abs(Number(t.amount) || 0);
      const signed = t.direction === "DEBIT" ? -amt : amt;
      return [csvCell(formatCsvDate(t.postedDate, fmt)), csvCell(sanitizeDescription(t.description)), money(signed)].join(",") + acctCols(t);
    });
  }

  const content = [header, ...rows].join("\r\n") + "\r\n";
  const name = input.accountName || input.institution || "statement";
  return { filename: `quickbooks-${slugify(name)}.csv`, mimeType: "text/csv", content };
}
