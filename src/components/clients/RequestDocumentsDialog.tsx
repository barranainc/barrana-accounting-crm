"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getChecklist, CLIENT_TYPE_LABELS, type ClientTypeKey } from "@/lib/document-checklist";
import { createBulkDocumentRequests } from "@/actions/requests";
import { Button } from "@/components/ui/button";
import { Send, Plus, X, Check, Loader2 } from "lucide-react";

interface Props {
  clientId: string;
  clientType: ClientTypeKey;
  /** Titles already requested (non-archived) — shown as done, not re-requestable. */
  existingTitles: string[];
}

const inputCls =
  "w-full rounded-md border border-brand-greyBorder bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy";

export function RequestDocumentsDialog({ clientId, clientType, existingTitles }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const categories = useMemo(() => getChecklist(clientType), [clientType]);
  const categoryNames = useMemo(() => categories.map((c) => c.category), [categories]);
  const existing = useMemo(() => new Set(existingTitles), [existingTitles]);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<{ title: string; category: string }[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState(categoryNames[0] ?? "Other");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedFromChecklist = useMemo(
    () =>
      categories.flatMap((c) =>
        c.items
          .filter((i) => checked[i.key] && !existing.has(i.label))
          .map((i) => ({ title: i.label, category: c.category }))
      ),
    [categories, checked, existing]
  );
  const totalToRequest = selectedFromChecklist.length + custom.length;

  function reset() {
    setChecked({});
    setCustom([]);
    setCustomTitle("");
    setDueDate("");
    setPriority("MEDIUM");
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function addCustom() {
    const title = customTitle.trim();
    if (!title) return;
    setCustom((prev) => [...prev, { title, category: customCategory || "Other" }]);
    setCustomTitle("");
  }

  function selectableKeys() {
    return categories.flatMap((c) => c.items.filter((i) => !existing.has(i.label)).map((i) => i.key));
  }

  function submit() {
    setError(null);
    if (totalToRequest === 0) {
      setError("Select at least one document, or add a custom one.");
      return;
    }
    const due = dueDate ? new Date(dueDate) : null;
    const items = [...selectedFromChecklist, ...custom].map((it) => ({
      clientId,
      title: it.title,
      category: it.category,
      dueDate: due,
      priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    }));
    startTransition(async () => {
      try {
        await createBulkDocumentRequests(items, "Admin request");
        close();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send requests.");
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="h-3.5 w-3.5" />
        Request documents
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-brand-greyBorder px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Request documents from client</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CLIENT_TYPE_LABELS[clientType]} checklist &middot; the client is notified and can upload in their portal.
                </p>
              </div>
              <button type="button" onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Checklist */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    From checklist
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      className="font-medium text-brand-navy hover:underline"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        for (const k of selectableKeys()) next[k] = true;
                        setChecked(next);
                      }}
                    >
                      Select all
                    </button>
                    <span className="text-brand-greyBorder">|</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:underline"
                      onClick={() => setChecked({})}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {categories.map((cat) => (
                    <div key={cat.category}>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                        {cat.category}
                      </p>
                      <ul className="space-y-0.5">
                        {cat.items.map((item) => {
                          const already = existing.has(item.label);
                          return (
                            <li key={item.key}>
                              <label
                                className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 ${
                                  already ? "opacity-60" : "cursor-pointer hover:bg-brand-greyLight"
                                }`}
                              >
                                {already ? (
                                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-green-100">
                                    <Check className="h-3 w-3 text-green-700" />
                                  </span>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={!!checked[item.key]}
                                    onChange={() => setChecked((p) => ({ ...p, [item.key]: !p[item.key] }))}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-greyBorder text-brand-navy focus:ring-brand-navy"
                                  />
                                )}
                                <span className="min-w-0">
                                  <span className="block text-sm leading-snug text-foreground">
                                    {item.label}
                                    {item.optional && (
                                      <span className="ml-1.5 align-middle rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                                        if applicable
                                      </span>
                                    )}
                                    {already && (
                                      <span className="ml-1.5 align-middle text-[11px] font-medium text-green-700">
                                        already requested
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom documents */}
              <div className="border-t border-brand-greyBorder pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Custom request
                </h3>
                {custom.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {custom.map((c, i) => (
                      <li
                        key={`${c.title}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-brand-greyBorder bg-brand-greyLight/50 px-2.5 py-1.5 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          {c.title} <span className="text-xs text-muted-foreground">· {c.category}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustom((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 text-muted-foreground hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputCls} min-w-0 flex-1`}
                    placeholder="e.g. 2024 vehicle insurance slip"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustom();
                      }
                    }}
                  />
                  <select
                    className={`${inputCls} w-auto`}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  >
                    {categoryNames.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  <Button type="button" size="sm" variant="outline" onClick={addCustom} disabled={!customTitle.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Shared options */}
              <div className="grid grid-cols-2 gap-3 border-t border-brand-greyBorder pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Due date (optional)</label>
                  <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-brand-greyBorder px-5 py-3">
              <div className="text-sm">
                {error ? (
                  <span className="text-red-600">{error}</span>
                ) : (
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{totalToRequest}</span> document
                    {totalToRequest !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={submit} disabled={pending || totalToRequest === 0}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {pending ? "Sending…" : `Request ${totalToRequest || ""}`.trim()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
