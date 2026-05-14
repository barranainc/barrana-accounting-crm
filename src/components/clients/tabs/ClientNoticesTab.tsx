import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import { fileUrl } from "@/lib/utils";
import { Bell, Download } from "lucide-react";

const NOTICE_TYPE_LABELS: Record<string, string> = {
  NOTICE_OF_ASSESSMENT: "Notice of Assessment",
  CRA_LETTER:           "CRA Letter",
  ENGAGEMENT_LETTER:    "Engagement Letter",
  REPORT:               "Report",
  MEMO:                 "Memo",
  INVOICE:              "Invoice",
  GENERAL:              "General",
};

export async function ClientNoticesTab({ clientId }: { clientId: string }) {
  const notices = await db.noticeLetter.findMany({
    where: { clientId },
    include: {
      publishedBy: { select: { name: true } },
      document: { select: { id: true, fileName: true, fileSize: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SectionCard title="Notices & Letters" description={`${notices.length} notice${notices.length !== 1 ? "s" : ""}`}>
      {notices.length === 0 ? (
        <EmptyState icon={Bell} title="No notices yet" description="Notices and letters published to this client will appear here." />
      ) : (
        <div className="divide-y divide-brand-greyBorder">
          {notices.map((notice) => (
            <div key={notice.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-foreground">{notice.title}</span>
                    <StatusBadge status={notice.status} />
                    <span className="text-xs text-muted-foreground">
                      {NOTICE_TYPE_LABELS[notice.noticeType] ?? notice.noticeType}
                    </span>
                  </div>
                  {notice.description && (
                    <p className="text-xs text-muted-foreground mb-1">{notice.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Published by {notice.publishedBy.name}</span>
                    {notice.publishedAt && <span>· {formatDate(notice.publishedAt)}</span>}
                    {notice.clientViewedAt && (
                      <span className="text-emerald-600">· Viewed {formatDate(notice.clientViewedAt)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={fileUrl(notice.document.id, true)}
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-brand-greyBorder px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
