import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { markNoticeViewed } from "@/actions/notices";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, fileUrl, fileSizeLabel } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ noticeId: string }> }) {
  const { noticeId } = await params;
  const notice = await db.noticeLetter.findUnique({ where: { id: noticeId }, select: { title: true } });
  return { title: notice?.title ?? "Notice" };
}

const NOTICE_TYPE_LABELS: Record<string, string> = {
  NOTICE_OF_ASSESSMENT: "Notice of Assessment",
  CRA_LETTER: "CRA Letter",
  ENGAGEMENT_LETTER: "Engagement Letter",
  REPORT: "Report",
  MEMO: "Memo",
  INVOICE: "Invoice",
  GENERAL: "General",
};

export default async function PortalNoticeDetailPage({ params }: { params: Promise<{ noticeId: string }> }) {
  const session = await requireClientUser();
  const { noticeId } = await params;
  const scope = await getPortalScope(session.user.id);

  if (!scope) notFound();

  const notice = await db.noticeLetter.findUnique({
    where: {
      id: noticeId,
      clientId: scope.clientId,
      status: { in: ["PUBLISHED", "VIEWED"] },
    },
    include: {
      document: {
        select: { id: true, fileName: true, fileSize: true, mimeType: true },
      },
      engagement: { select: { id: true, title: true } },
    },
  });

  if (!notice) notFound();

  // Mark as viewed (no-op if already viewed)
  await markNoticeViewed(noticeId);

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <Link
          href="/portal/notices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          All notices
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-semibold text-foreground">{notice.title}</h1>
          <StatusBadge status={notice.clientViewedAt ? "VIEWED" : "PUBLISHED"} />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground mb-4">
          <span>
            <span className="font-medium text-foreground">Type:</span>{" "}
            {NOTICE_TYPE_LABELS[notice.noticeType] ?? notice.noticeType}
          </span>
          {notice.engagement && (
            <span>
              <span className="font-medium text-foreground">Engagement:</span>{" "}
              {notice.engagement.title}
            </span>
          )}
          {notice.publishedAt && (
            <span>
              <span className="font-medium text-foreground">Date:</span>{" "}
              {formatDate(notice.publishedAt)}
            </span>
          )}
        </div>

        {notice.description && (
          <p className="text-sm text-foreground whitespace-pre-wrap">{notice.description}</p>
        )}
      </div>

      {/* Document */}
      <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Attached document</h2>
        <div className="flex items-center justify-between gap-4 rounded-md border border-brand-greyBorder bg-brand-greyLight/40 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-8 w-8 text-brand-navy shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{notice.document.fileName}</p>
              <p className="text-xs text-muted-foreground">{fileSizeLabel(notice.document.fileSize)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={fileUrl(notice.document.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-greyBorder bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-brand-greyLight transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </a>
            <a
              href={fileUrl(notice.document.id, true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-navyDark transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
