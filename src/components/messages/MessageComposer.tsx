"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/actions/messages";
import { Send, Loader2 } from "lucide-react";

interface Props {
  threadId: string;
  /** Staff get an "internal note" toggle; clients always post client-visible. */
  isStaff?: boolean;
}

export function MessageComposer({ threadId, isStaff = false }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      try {
        await sendMessage({ threadId, body: text, isInternal: isStaff ? internal : false });
        setBody("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={isStaff ? "Write a reply…" : "Write a message to your accounting team…"}
          className="flex-1 rounded-md border border-brand-greyBorder bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="rounded-md bg-brand-navy px-3.5 py-2.5 text-white hover:bg-brand-navyDark disabled:opacity-60"
          aria-label="Send message"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        {isStaff ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-brand-greyBorder text-brand-plum focus:ring-brand-plum"
            />
            Internal note (staff only — client won&rsquo;t see this)
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">Your accounting team is notified.</span>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
