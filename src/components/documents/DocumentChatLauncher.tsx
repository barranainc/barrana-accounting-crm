"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDocumentComments, addDocumentComment, markDocumentMessagesRead } from "@/actions/documents";
import { formatDateTime } from "@/lib/utils";
import { MessageCircle, X, Send, Loader2, ExternalLink } from "lucide-react";

interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string | Date;
  author: { id: string; name: string | null; role: string };
}

interface Props {
  documentId: string;
  docTitle: string;
  forRequest?: string | null;
  initialUnread: number;
  /** Staff side: own messages on the right, client on the left; opens the staff document page. */
  isStaff?: boolean;
}

export function DocumentChatLauncher({ documentId, docTitle, forRequest, initialUnread, isStaff = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();

  // The shared conversation (client-visible messages); internal staff notes stay on the detail page.
  const thread = comments.filter((c) => !c.isInternal);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = (await getDocumentComments(documentId)) as unknown as Comment[];
      setComments(list);
      if (unread > 0) {
        await markDocumentMessagesRead(documentId);
        setUnread(0);
        router.refresh();
      }
    } catch {
      setError("Couldn't load messages.");
    } finally {
      setLoading(false);
    }
  }

  function openPopup() {
    setOpen(true);
    void load();
  }

  function send() {
    const text = body.trim();
    if (!text) return;
    setError(null);
    startSend(async () => {
      try {
        await addDocumentComment({ documentId, body: text, isInternal: false });
        setBody("");
        const list = (await getDocumentComments(documentId)) as unknown as Comment[];
        setComments(list);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to send.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPopup}
        className="relative mt-0.5 shrink-0"
        title={unread > 0 ? `${unread} new message${unread !== 1 ? "s" : ""}` : "Messages"}
        aria-label={unread > 0 ? `${unread} new messages` : "Open messages"}
      >
        <MessageCircle className={`h-4 w-4 ${unread > 0 ? "text-brand-navy" : "text-muted-foreground/40"}`} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-brand-greyBorder px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <MessageCircle className="h-4 w-4 text-brand-navy shrink-0" />
                  <span className="truncate">{docTitle}</span>
                </p>
                {forRequest && <p className="mt-0.5 truncate text-xs text-muted-foreground">For: {forRequest}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Thread */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-brand-greyLight/40 px-4 py-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : thread.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No messages yet about this document.</p>
              ) : (
                thread.map((c) => {
                  const mine = isStaff ? c.author.role !== "CLIENT_USER" : c.author.role === "CLIENT_USER";
                  return (
                    <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[82%] rounded-lg px-3 py-2 ${
                          mine ? "bg-brand-navy text-white" : "border border-brand-greyBorder bg-white text-foreground"
                        }`}
                      >
                        <p className={`mb-0.5 text-[11px] ${mine ? "text-white/75" : "text-muted-foreground"}`}>
                          {mine ? "You" : c.author.name ?? (isStaff ? "Client" : "Accountant")} · {formatDateTime(c.createdAt)}
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply + open document */}
            <div className="space-y-2 border-t border-brand-greyBorder px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={isStaff ? "Reply to the client…" : "Reply to your accountant…"}
                  className="flex-1 rounded-md border border-brand-greyBorder px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !body.trim()}
                  className="rounded-md bg-brand-navy px-3 py-2 text-white hover:bg-brand-navyDark disabled:opacity-60"
                  aria-label="Send reply"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Link
                href={isStaff ? `/documents/${documentId}` : `/portal/documents/${documentId}`}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs text-brand-navy hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open document
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
