import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { getDocumentComments } from "@/actions/documents";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/shared/SectionCard";
import { DocumentCommentForm } from "@/components/documents/DocumentCommentForm";
import { MarkDocumentReadOnView } from "@/components/documents/MarkDocumentReadOnView";
import { formatDateTime, fileSizeLabel, fileUrl } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Eye, Download, FileText } from "lucide-react";

export const metadata = { title: "Document" };

export default async function PortalDocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const session = await requireClientUser();
  const scope = await getPortalScope(session.user.id);
  const { documentId } = await params;
  if (!scope) notFound();

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: { documentRequest: { select: { title: true } } },
  });
  // Clients can only open their own client-visible documents
  if (!doc || doc.clientId !== scope.clientId || doc.visibility !== "CLIENT_VISIBLE") notFound();

  const comments = await getDocumentComments(documentId);
  const unreadCount = await db.documentComment.count({
    where: { documentId, isInternal: false, readByClientAt: null, author: { role: { not: "CLIENT_USER" } } },
  });

  const linkBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-brand-greyBorder bg-white px-3 py-1.5 text-sm hover:bg-brand-greyLight transition-colors";

  return (
    <div className="max-w-3xl">
      <MarkDocumentReadOnView documentId={doc.id} hasUnread={unreadCount > 0} />
      <Link
        href="/portal/documents"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to documents
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 shrink-0">
            <FileText className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{doc.title}</h1>
            {doc.documentRequest && (
              <p className="text-sm text-brand-navy mt-0.5">For: {doc.documentRequest.title}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{fileSizeLabel(doc.fileSize)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={fileUrl(doc.id)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
            <Eye className="h-3.5 w-3.5" />
            View
          </a>
          <a href={fileUrl(doc.id, true)} className={linkBtn}>
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>

      {/* Discussion */}
      <SectionCard title={`Messages from your accountant (${comments.length})`}>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No messages about this document yet. If your accountant has a question, it will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-brand-greyBorder">
            {comments.map((c) => {
              const mine = c.author.role === "CLIENT_USER";
              return (
                <li key={c.id} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      {mine ? "You" : c.author.name}
                      {!mine && (
                        <span className="bg-brand-navy/10 text-brand-navy rounded px-1.5 py-0.5 font-medium">
                          Accountant
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
                </li>
              );
            })}
          </ul>
        )}
        <DocumentCommentForm documentId={doc.id} isStaff={false} />
      </SectionCard>
    </div>
  );
}
