"use client";

import { getChecklist, CLIENT_TYPE_LABELS, type ClientTypeKey } from "@/lib/document-checklist";
import { ClipboardList } from "lucide-react";

interface Props {
  clientType: ClientTypeKey;
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSetMany: (keys: string[], value: boolean) => void;
}

export function DocumentChecklistSidebar({ clientType, checked, onToggle, onSetMany }: Props) {
  const categories = getChecklist(clientType);
  const allKeys = categories.flatMap((c) => c.items.map((i) => i.key));
  const selectedCount = allKeys.filter((k) => checked[k]).length;
  const total = allKeys.length;

  return (
    <aside className="rounded-lg border border-brand-greyBorder bg-white lg:sticky lg:top-6">
      {/* Header */}
      <div className="border-b border-brand-greyBorder px-4 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/10">
            <ClipboardList className="h-4 w-4 text-brand-navy" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Document checklist</h2>
            <p className="text-xs text-muted-foreground">
              {CLIENT_TYPE_LABELS[clientType]} &middot; {selectedCount} of {total} selected
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => onSetMany(allKeys, true)}
            className="font-medium text-brand-navy hover:underline"
          >
            Select all
          </button>
          <span className="text-brand-greyBorder">|</span>
          <button
            type="button"
            onClick={() => onSetMany(allKeys, false)}
            className="font-medium text-muted-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-4">
        {categories.map((cat) => {
          const catKeys = cat.items.map((i) => i.key);
          const allOn = catKeys.every((k) => checked[k]);
          return (
            <div key={cat.category}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.category}
                </h3>
                <button
                  type="button"
                  onClick={() => onSetMany(catKeys, !allOn)}
                  className="text-[11px] text-brand-navy hover:underline shrink-0"
                >
                  {allOn ? "none" : "all"}
                </button>
              </div>
              <ul className="space-y-1">
                {cat.items.map((item) => (
                  <li key={item.key}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-brand-greyLight">
                      <input
                        type="checkbox"
                        checked={!!checked[item.key]}
                        onChange={() => onToggle(item.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-greyBorder text-brand-navy focus:ring-brand-navy"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug text-foreground">
                          {item.label}
                          {item.optional && (
                            <span className="ml-1.5 align-middle rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                              if applicable
                            </span>
                          )}
                        </span>
                        {item.note && (
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {item.note}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-brand-greyBorder px-4 py-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground">
          Checked items become document requests for this client and appear in their portal.
        </p>
      </div>
    </aside>
  );
}
