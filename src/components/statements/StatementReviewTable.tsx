"use client";

import { useMemo, useState, useTransition } from "react";
import { saveStatementTransactions } from "@/actions/statements";
import { cn, formatMoney } from "@/lib/utils";
import {
  CHART_OF_ACCOUNTS,
  accountByName,
  accountByNumber,
  type ChartAccount,
} from "@/lib/chart-of-accounts";
import { Save, Check, Tag, ArrowDownLeft, ArrowUpRight, Sparkles } from "lucide-react";

export interface ReviewRow {
  id: string;
  postedDate: string; // yyyy-mm-dd
  description: string;
  amount: number;
  direction: "DEBIT" | "CREDIT";
  excluded: boolean;
  // Chart-of-Accounts mapping ("" = uncategorised).
  accountName: string;
  accountNumber: string;
  accountType: string;
  accountDetailType: string;
}

// Ghost fields read as clean text until hovered/focused, then reveal an input chrome.
const ghost =
  "min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-colors hover:border-brand-greyBorder focus:border-brand-navy focus:bg-white focus:ring-1 focus:ring-brand-navy disabled:cursor-default disabled:hover:border-transparent";
const select =
  "rounded-md border border-brand-greyBorder bg-white px-2 py-1.5 text-sm text-foreground outline-none transition-colors hover:border-brand-navy/50 focus:border-brand-navy focus:ring-1 focus:ring-brand-navy disabled:bg-brand-greyLight/60 disabled:text-muted-foreground";

// Accounts grouped by type once, so both dropdowns render tidy <optgroup>s.
const ACCOUNTS_BY_TYPE: { type: string; accounts: ChartAccount[] }[] = (() => {
  const order: string[] = [];
  const map = new Map<string, ChartAccount[]>();
  for (const a of CHART_OF_ACCOUNTS) {
    if (!map.has(a.type)) {
      map.set(a.type, []);
      order.push(a.type);
    }
    map.get(a.type)!.push(a);
  }
  return order.map((type) => ({ type, accounts: map.get(type)! }));
})();

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

  // Pick by full name → auto-fill number, type, detail type from the sheet.
  function selectByName(id: string, name: string) {
    const a = name ? accountByName(name) : undefined;
    update(id, {
      accountName: name,
      accountNumber: a?.number ?? "",
      accountType: a?.type ?? "",
      accountDetailType: a?.detailType ?? "",
    });
  }

  // Pick by account number → auto-fill name, type, detail type from the sheet.
  function selectByNumber(id: string, number: string) {
    const a = number ? accountByNumber(number) : undefined;
    update(id, {
      accountNumber: number,
      accountName: a?.name ?? "",
      accountType: a?.type ?? "",
      accountDetailType: a?.detailType ?? "",
    });
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

  const stats = useMemo(() => {
    const included = rows.filter((r) => !r.excluded);
    const credits = included
      .filter((r) => r.direction === "CREDIT")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const debits = included
      .filter((r) => r.direction === "DEBIT")
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const categorised = included.filter((r) => r.accountName).length;
    const pct = included.length ? Math.round((categorised / included.length) * 100) : 0;
    return { includedCount: included.length, credits, debits, categorised, pct };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No transactions yet. Process the statement to extract its transactions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Categorisation progress */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-brand-greyBorder bg-gradient-to-r from-brand-navy/[0.03] to-transparent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
            <Tag className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Categorise transactions</p>
            <p className="text-xs text-muted-foreground">
              Map each row to a Chart-of-Accounts account for a clean QuickBooks import.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-brand-greyBorder">
            <div
              className="h-full rounded-full bg-brand-navy transition-all duration-500"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {stats.categorised}/{stats.includedCount}
          </span>
        </div>
      </div>

      {/* Transaction cards */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const out = r.direction === "DEBIT";
          const mapped = !!r.accountName;
          return (
            <div
              key={r.id}
              className={cn(
                "group relative overflow-hidden rounded-lg border bg-white transition-all",
                r.excluded
                  ? "border-dashed border-brand-greyBorder opacity-55"
                  : "border-brand-greyBorder hover:shadow-md hover:border-brand-navy/30",
                mapped && !r.excluded && "ring-1 ring-brand-navy/15"
              )}
            >
              {/* Direction accent */}
              <span
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  r.excluded ? "bg-brand-greyBorder" : out ? "bg-rose-400" : "bg-emerald-400"
                )}
              />

              {/* Zone 1 — the transaction */}
              <div className="flex items-center gap-3 py-2.5 pl-5 pr-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-brand-navy"
                  checked={!r.excluded}
                  disabled={readOnly}
                  onChange={(e) => update(r.id, { excluded: !e.target.checked })}
                  aria-label="Include in export"
                />
                <input
                  type="date"
                  className={cn(ghost, "w-[8.5rem] shrink-0 text-muted-foreground")}
                  value={r.postedDate}
                  disabled={readOnly}
                  onChange={(e) => update(r.id, { postedDate: e.target.value })}
                />
                <input
                  type="text"
                  className={cn(ghost, "flex-1 font-medium text-foreground")}
                  value={r.description}
                  disabled={readOnly}
                  placeholder="Description"
                  onChange={(e) => update(r.id, { description: e.target.value })}
                  title={r.description}
                />

                {/* Amount */}
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-end font-semibold tabular-nums",
                    out ? "text-rose-600" : "text-emerald-600"
                  )}
                >
                  <span className="mr-0.5 text-sm">{out ? "−" : "+"}</span>
                  <input
                    type="number"
                    step="0.01"
                    className={cn(ghost, "w-24 text-right font-semibold", out ? "text-rose-600" : "text-emerald-600")}
                    value={Number.isFinite(r.amount) ? r.amount : 0}
                    disabled={readOnly}
                    onChange={(e) => update(r.id, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {/* Direction segmented toggle */}
                <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-brand-greyBorder text-xs">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => update(r.id, { direction: "DEBIT" })}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 transition-colors disabled:cursor-default",
                      out ? "bg-rose-50 font-medium text-rose-700" : "bg-white text-muted-foreground hover:bg-brand-greyLight"
                    )}
                  >
                    <ArrowUpRight className="h-3 w-3" /> Out
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => update(r.id, { direction: "CREDIT" })}
                    className={cn(
                      "flex items-center gap-1 border-l border-brand-greyBorder px-2 py-1 transition-colors disabled:cursor-default",
                      !out ? "bg-emerald-50 font-medium text-emerald-700" : "bg-white text-muted-foreground hover:bg-brand-greyLight"
                    )}
                  >
                    <ArrowDownLeft className="h-3 w-3" /> In
                  </button>
                </div>
              </div>

              {/* Zone 2 — the Chart-of-Accounts categorisation */}
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-2.5 gap-y-2 border-t py-2.5 pl-5 pr-4",
                  mapped ? "border-brand-navy/10 bg-brand-navy/[0.02]" : "border-brand-greyBorder/70 bg-brand-greyLight/40"
                )}
              >
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Account
                </span>

                {/* Full name — selecting it fills number / type / detail type. */}
                <select
                  className={cn(select, "min-w-[15rem] flex-1 basis-64 max-w-lg")}
                  value={r.accountName}
                  disabled={readOnly}
                  onChange={(e) => selectByName(r.id, e.target.value)}
                  aria-label="Chart-of-Accounts full name"
                >
                  <option value="">— Uncategorised —</option>
                  {ACCOUNTS_BY_TYPE.map((g) => (
                    <optgroup key={g.type} label={g.type}>
                      {g.accounts.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.number ? `${a.number} · ${a.name}` : a.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {/* Account # — selecting it fills name / type / detail type. */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">#</span>
                  <select
                    className={cn(select, "w-[5.5rem] tabular-nums")}
                    value={r.accountNumber}
                    disabled={readOnly}
                    onChange={(e) => selectByNumber(r.id, e.target.value)}
                    aria-label="Chart-of-Accounts number"
                    title={r.accountName || undefined}
                  >
                    <option value="">—</option>
                    {ACCOUNTS_BY_TYPE.map((g) => {
                      const numbered = g.accounts.filter((a) => a.number);
                      if (numbered.length === 0) return null;
                      return (
                        <optgroup key={g.type} label={g.type}>
                          {numbered.map((a) => (
                            <option key={a.number} value={a.number}>
                              {a.number}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Type + Detail type — derived, shown as read-only pills. */}
                {mapped ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-medium text-brand-navy" title="Account type">
                      {r.accountType || "—"}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-brand-greyLight px-2.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-brand-greyBorder" title="Detail type">
                      {r.accountDetailType || "—"}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs italic text-muted-foreground/60">
                    <Sparkles className="h-3 w-3" /> type &amp; detail fill in automatically
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals + save */}
      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-greyBorder bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{stats.includedCount}</span> of{" "}
            <span className="tabular-nums">{rows.length}</span> rows export
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <ArrowDownLeft className="h-3.5 w-3.5" /> In {formatMoney(stats.credits, currency)}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-600">
            <ArrowUpRight className="h-3.5 w-3.5" /> Out {formatMoney(stats.debits, currency)}
          </span>
          <span className="font-semibold text-foreground">
            Net {formatMoney(stats.credits - stats.debits, currency)}
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600">{error}</span>}
            {savedAt && !pending && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <Check className="h-3.5 w-3.5" /> Saved {savedAt}
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-navyDark disabled:opacity-60"
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
