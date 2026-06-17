import type { QbExportInput } from "./types";
import { toDate } from "./format";

// Pre-export sanity checks against QuickBooks' documented import constraints.
// Returns human-readable warnings (empty = clean). Non-blocking by design.
export function qbExportWarnings(input: QbExportInput): string[] {
  const w: string[] = [];
  const txns = input.transactions;

  if (txns.length === 0) {
    w.push("No transactions to export.");
    return w;
  }
  if (txns.length > 1000) {
    w.push(
      `${txns.length} transactions exceeds QuickBooks' ~1,000-row import limit — split into multiple files.`
    );
  }
  if (txns.some((t) => Math.abs(Number(t.amount) || 0) < 0.005)) {
    w.push("Some rows have a zero amount and will be dropped (QuickBooks rejects zero-value transactions).");
  }
  const tomorrow = Date.now() + 86_400_000;
  if (txns.some((t) => {
    const d = toDate(t.postedDate);
    return !Number.isNaN(d.getTime()) && d.getTime() > tomorrow;
  })) {
    w.push("Some transactions are dated in the future — check the extracted dates.");
  }
  return w;
}
