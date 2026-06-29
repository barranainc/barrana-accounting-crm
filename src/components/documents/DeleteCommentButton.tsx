"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDocumentComment } from "@/actions/documents";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm("Delete this message? This can't be undone.")) return;
    startTransition(async () => {
      try {
        await deleteDocumentComment(commentId);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to delete the message.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-muted-foreground hover:text-red-600 disabled:opacity-50 transition-colors"
      title="Delete message"
      aria-label="Delete message"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
