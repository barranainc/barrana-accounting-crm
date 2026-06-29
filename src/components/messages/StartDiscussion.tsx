"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createThread, sendMessage } from "@/actions/messages";
import { Plus, Send, Loader2, X } from "lucide-react";

export function StartDiscussion({
  clientId,
  target = "portal",
}: {
  clientId: string;
  target?: "portal" | "staff";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) {
      setError("Please enter a message.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const thread = await createThread({
          clientId,
          subject: subject.trim() || "General discussion",
          threadType: "CLIENT_STAFF",
        });
        await sendMessage({ threadId: thread.id, body: text, isInternal: false });
        setOpen(false);
        setSubject("");
        setBody("");
        router.push(target === "staff" ? `/messages/${thread.id}` : `/portal/messages?threadId=${thread.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start the discussion.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
      >
        <Plus className="h-4 w-4" />
        Start a discussion
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-brand-greyBorder bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">New discussion</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (optional) — e.g. Question about my invoice"
        className="mb-2 w-full rounded-md border border-brand-greyBorder px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type your message…"
        className="w-full rounded-md border border-brand-greyBorder px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "Sending…" : "Send"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
