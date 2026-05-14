import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatDateTime, fileSizeLabel, fileUrl } from "@/lib/utils";
import { reviewDocument, setDocumentVisibility } from "@/actions/documents";
import Link from "next/link";
import {
  FileText, Download, Eye, ArrowLeft, Lock, Globe,
  Clock, User, Link2,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const doc = await db.document.findUnique({ where: { id: documentId }, select: { title: true } });
  return { title: doc?.title ?? "Document" };
}

const REVIEW_STATUS_OPTS = [
  { value: "UNREVIEWED",        label: "Unreviewed" },
  { value: "UNDER_REVIEW",      label: "Under review" },
  { value: "ACCEPTED",          label: "Accept" },
  { value: "REJECTED",          label: "Reject" },
  { value: "NEEDS_REPLACEMENT", label: "Needs replacement" },
];

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  await requireStaff();
  const { documentId } = await params;

  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: {
      client:          { select: { id: true, businessName: true } },
      engagement:      { select: { id: true, title: true } },
      documentRequest: { select: { id: true, title: true, status: true } },
      uploadedBy:      { select: { id: true, name: true, role: true } },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!doc) notFound();

  // Server action — review status change
  async function handleReview(formData: FormData) {
    "use server";
    const status = formData.get("reviewStatus") as string;
    if (!status) return;
    await reviewDocument(documentId, status as never);
  }

  // Server action — visibility toggle
  async function handleVisibility(formData: FormData) {
    "use server";
    const vis = formData.get("visibility") as string;
    if (!vis) return;
    await setDocumentVisibility(documentId, vis as "INTERNAL" | "CLIENT_VISIBLE");
  }

  const isClientVisible = doc.visibility === "CLIENT_VISIBLE";
  const uploaderIsClient = doc.uploadedBy.role === "CLIENT_USER";

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/documents" className="hover:text-brand-navy flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Documents
        </Link>
        <span>/</span>
        <Link href={`/clients/${doc.client.id}`} className="hover:text-brand-navy">{doc.client.businessName}</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-xs">{doc.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 shrink-0">
            <FileText className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{doc.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={doc.reviewStatus} />
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isClientVisible ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-600"
              }`}>
                {isClientVisible ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isClientVisible ? "Client visible" : "Internal"}
              </span>
              <span className="text-xs text-muted-foreground">v{doc.versionNumber}</span>
              {!doc.isCurrentVersion && (
                <span className="text-xs font-medium text-amber-600">Not current version</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={fileUrl(doc.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-greyBorder bg-white px-3 py-1.5 text-sm hover:bg-brand-greyLight transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </a>
          <a
            href={fileUrl(doc.id, true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-sm text-white hover:bg-brand-navyDark transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — metadata */}
        <div className="lg:col-span-2 space-y-5">
          {/* File details */}
          <SectionCard title="File details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">File name</dt>
                <dd className="font-medium mt-0.5 truncate">{doc.fileName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">File size</dt>
                <dd className="font-medium mt-0.5">{fileSizeLabel(doc.fileSize)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd className="font-medium mt-0.5">{doc.mimeType}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="font-medium mt-0.5">{doc.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Document type</dt>
                <dd className="font-medium mt-0.5">{doc.documentType}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Version</dt>
                <dd className="font-medium mt-0.5">v{doc.versionNumber}</dd>
              </div>
              {(doc.reportingPeriodStart || doc.reportingPeriodEnd) && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Reporting period</dt>
                  <dd className="font-medium mt-0.5">
                    {doc.reportingPeriodStart ? formatDate(doc.reportingPeriodStart) : "—"}
                    {" – "}
                    {doc.reportingPeriodEnd ? formatDate(doc.reportingPeriodEnd) : "—"}
                  </dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {/* Linked records */}
          <SectionCard title="Linked to">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Link2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">Client</dt>
                  <dd className="mt-0.5">
                    <Link href={`/clients/${doc.client.id}`} className="font-medium hover:text-brand-navy">
                      {doc.client.businessName}
                    </Link>
                  </dd>
                </div>
              </div>
              {doc.engagement && (
                <div className="flex items-start gap-2">
                  <Link2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Engagement</dt>
                    <dd className="mt-0.5">
                      <Link href={`/engagements/${doc.engagement.id}`} className="font-medium hover:text-brand-navy">
                        {doc.engagement.title}
                      </Link>
                    </dd>
                  </div>
                </div>
              )}
              {doc.documentRequest && (
                <div className="flex items-start gap-2">
                  <Link2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Document request</dt>
                    <dd className="flex items-center gap-2 mt-0.5">
                      <span className="font-medium">{doc.documentRequest.title}</span>
                      <StatusBadge status={doc.documentRequest.status} />
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">Uploaded by</dt>
                  <dd className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium">{doc.uploadedBy.name}</span>
                    {uploaderIsClient && (
                      <span className="text-xs text-brand-navy bg-brand-navy/8 rounded px-1.5 py-0.5">Client</span>
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <dt className="text-xs text-muted-foreground">Uploaded</dt>
                  <dd className="font-medium mt-0.5">{formatDateTime(doc.createdAt)}</dd>
                </div>
              </div>
            </dl>
          </SectionCard>

          {/* Comments */}
          <SectionCard title={`Comments (${doc.comments.length})`}>
            {doc.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No comments yet.</p>
            ) : (
              <ul className="divide-y divide-brand-greyBorder">
                {doc.comments.map((comment) => (
                  <li key={comment.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{comment.author.name}</span>
                        {comment.isInternal && (
                          <span className="text-xs bg-brand-plum/10 text-brand-plum rounded px-1.5 py-0.5">Internal</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Right column — actions */}
        <div className="space-y-5">
          {/* Review action */}
          <SectionCard title="Review status">
            <p className="text-xs text-muted-foreground mb-3">Current: <strong>{doc.reviewStatus.replace(/_/g, " ")}</strong></p>
            <form action={handleReview} className="space-y-3">
              <select
                name="reviewStatus"
                defaultValue={doc.reviewStatus}
                className="w-full h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm"
              >
                {REVIEW_STATUS_OPTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
              >
                Update review status
              </button>
            </form>
          </SectionCard>

          {/* Visibility action */}
          <SectionCard title="Visibility">
            <p className="text-xs text-muted-foreground mb-3">
              {isClientVisible
                ? "This document is visible to the client in their portal."
                : "This document is internal — clients cannot see it."}
            </p>
            <form action={handleVisibility}>
              <input
                type="hidden"
                name="visibility"
                value={isClientVisible ? "INTERNAL" : "CLIENT_VISIBLE"}
              />
              <button
                type="submit"
                className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isClientVisible
                    ? "border border-brand-greyBorder bg-white hover:bg-brand-greyLight"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {isClientVisible ? "Make internal" : "Make client-visible"}
              </button>
            </form>
          </SectionCard>

          {/* Version info */}
          {doc.rootDocumentId && doc.rootDocumentId !== doc.id && (
            <SectionCard title="Version chain">
              <p className="text-xs text-muted-foreground">
                This is version {doc.versionNumber} of this document.
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
