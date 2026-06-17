"use client";

import { useState, useTransition } from "react";
import { saveStatementTransactions } from "@/actions/statements";
import { formatMoney } from "@/lib/utils";
import { Save, Check } from "lucide-react";

export interface ReviewRow {
  id: string;
  postedDate: string; // yyyy-mm-dd
  description: string;
  amount: number;
  direction: "DEBIT" | "CREDIT";
  excluded: boolean;
}

const inputCls =
  "w-full rounded-md border border-brand-greyBorder bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy";

export function StatementReviewTable({
  statementId,
  initialRows,
  currency,
  readOnly = false,
}: {
  statementId: string;
  initialRows: ReviewRow[];
  currency: string;
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(initialRows);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, patch: Partial<ReviewRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSavedAt(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await saveStatementTransactions(statementId, rows);
        setSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  const included = rows.filter((r) => !r.excluded);
  const credits = included
    .filter((r) => r.direction === "CREDIT")
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const debits = included
    .filter((r) => r.direction === "DEBIT")
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No transactions yet. Process the statement to extract its transactions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-brand-greyBorder">
        <table className="w-full text-sm">
          <thead className="bg-brand-greyLight text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-16">Export</th>
              <th className="px-3 py-2 w-36">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 w-32">Amount</th>
              <th className="px-3 py-2 w-32">Direction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-greyBorder">
            {rows.map((r) => (
              <tr key={r.id} className={r.excluded ? "opacity-40" : ""}>
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={!r.excluded}
                    disabled={readOnly}
                    onChange={(e) => update(r.id, { excluded: !e.target.checked })}
                    aria-label="Include in export"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="date"
                    className={inputCls}
                    value={r.postedDate}
                    disabled={readOnly}
                    onChange={(e) => update(r.id, { postedDate: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    className={inputCls}
                    value={r.description}
                    disabled={readOnly}
                    onChange={(e) => update(r.id, { description: e.target.value })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputCls} text-right`}
                    value={Number.isFinite(r.amount) ? r.amount : 0}
                    disabled={readOnly}
                    onChange={(e) => update(r.id, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <select
                    className={inputCls}
                    value={r.direction}
                    disabled={readOnly}
                    onChange={(e) => update(r.id, { direction: e.target.value as "DEBIT" | "CREDIT" })}
                  >
                    <option value="DEBIT">Debit (out)</option>
                    <option value="CREDIT">Credit (in)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals + save */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">
            {included.length} of {rows.length} rows will export
          </span>
          <span className="text-green-700">In: {formatMoney(credits, currency)}</span>
          <span className="text-red-700">Out: {formatMoney(debits, currency)}</span>
          <span className="font-medium">Net: {formatMoney(credits - debits, currency)}</span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600">{error}</span>}
            {savedAt && !pending && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <Check className="h-3.5 w-3.5" /> Saved {savedAt}
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
