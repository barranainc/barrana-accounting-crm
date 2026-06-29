"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDocumentComment } from "@/actions/documents";
import { Send, Loader2 } from "lucide-react";

interface Props {
  documentId: string;
  /** Staff get the "ask client vs internal note" choice; clients always reply to staff. */
  isStaff: boolean;
}

export function DocumentCommentForm({ documentId, isStaff }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [toClient, setToClient] = useState(true); // staff default: ask the client
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      try {
        await addDocumentComment({
          documentId,
          body: text,
          isInternal: isStaff ? !toClient : false,
        });
        setBody("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send.");
      }
    });
  }

  return (
    <div className="mt-3 border-t border-brand-greyBorder pt-3">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          isStaff
            ? "Ask the client about this document — e.g. a transaction you need explained…"
            : "Reply to your accountant…"
        }
        className="w-full rounded-md border border-brand-greyBorder bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        {isStaff ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={toClient}
              onChange={(e) => setToClient(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-brand-greyBorder text-brand-navy focus:ring-brand-navy"
            />
            {toClient
              ? "Send to client (they'll be notified and can reply)"
              : "Internal note (staff only — client won't see this)"}
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">Your accountant will be notified.</span>
        )}

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {isStaff ? (toClient ? "Send to client" : "Add note") : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
