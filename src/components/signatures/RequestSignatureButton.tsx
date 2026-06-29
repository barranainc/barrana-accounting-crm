"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSignatureRequest, sendSignatureRequest } from "@/actions/signatures";
import { PenLine, Send, Loader2, X } from "lucide-react";

interface Props {
  clientId: string;
  documentId: string;
  docTitle: string;
}

export function RequestSignatureButton({ clientId, documentId, docTitle }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Signature required: ${docTitle}`);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const created = await createSignatureRequest({
          clientId,
          documentId,
          title: title.trim(),
          message: message.trim() || undefined,
        });
        await sendSignatureRequest(created.id);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send the signature request.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-plum px-4 py-2 text-sm font-medium text-white hover:bg-brand-plum/90 transition-colors"
      >
        <PenLine className="h-4 w-4" />
        Request signature
      </button>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Send for client signature</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-2 w-full rounded-md border border-brand-greyBorder px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />
      <textarea
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message to the client (optional)"
        className="mb-2 w-full rounded-md border border-brand-greyBorder px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-plum px-4 py-2 text-sm font-medium text-white hover:bg-brand-plum/90 disabled:opacity-60 transition-colors"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Sending…" : "Send to client"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
