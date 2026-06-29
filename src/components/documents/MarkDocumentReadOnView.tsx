"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markDocumentMessagesRead } from "@/actions/documents";

/** Marks a document's incoming messages read when the client opens its detail page. */
export function MarkDocumentReadOnView({ documentId, hasUnread }: { documentId: string; hasUnread: boolean }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (!hasUnread || done.current) return;
    done.current = true;
    markDocumentMessagesRead(documentId)
      .then(() => router.refresh())
      .catch(() => {});
  }, [documentId, hasUnread, router]);

  return null;
}
