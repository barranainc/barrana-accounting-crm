import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, fileUrl } from "@/lib/utils";
import { Bell, Download, Eye } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Notices & Letters" };

const NOTICE_TYPE_LABELS: Record<string, string> = {
  NOTICE_OF_ASSESSMENT: "Notice of Assessment",
  CRA_LETTER: "CRA Letter",
  ENGAGEMENT_LETTER: "Engagement Letter",
  REPORT: "Report",
  MEMO: "Memo",
  INVOICE: "Invoice",
  GENERAL: "General",
};

export default async function PortalNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ noticeType?: string }>;
}) {
  const session = await requireClientUser();
  const scope = await getPortalScope(session.user.id);

  if (!scope) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Your account is not linked to a client. Please contact your accountant.</p>
      </div>
    );
  }

  const { noticeType } = await searchParams;

  const notices = await db.noticeLetter.findMany({
    where: {
      clientId: scope.clientId,
      status: { in: ["PUBLISHED", "VIEWED"] },
      ...(noticeType ? { noticeType: noticeType as never } : {}),
    },
    include: {
      document: { select: { id: true, fileName: true } },
      engagement: { select: { id: true, title: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  const distinctTypes = await db.noticeLetter.findMany({
    where: {
      clientId: scope.clientId,
      status: { in: ["PUBLISHED", "VIEWED"] },
    },
    select: { noticeType: true },
    distinct: ["noticeType"],
  });

  return (
    <div>
      <PageHeader title="Notices & Letters" description={`${notices.length} notice${notices.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      {distinctTypes.length > 1 && (
        <form className="mb-5 flex flex-wrap gap-3">
          <select name="noticeType" defaultValue={noticeType ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
            <option value="">All types</option>
            {distinctTypes.map(({ noticeType: t }) => (
              <option key={t} value={t}>{NOTICE_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
          {noticeType && (
            <Link href="/portal/notices" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</Link>
          )}
        </form>
      )}

      {notices.length === 0 ? (
        <EmptyState icon={Bell} title="No notices yet" description="Notices and letters from your accountant will appear here." />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Notice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Engagement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {notices.map((notice) => (
                <tr key={notice.id} className="hover:bg-brand-greyLight/50 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/portal/notices/${notice.id}`} className="block">
                      <p className="font-medium text-foreground hover:text-brand-navy">{notice.title}</p>
                      {notice.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{notice.description}</p>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                    {NOTICE_TYPE_LABELS[notice.noticeType] ?? notice.noticeType}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                    {notice.engagement?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {notice.publishedAt ? formatDate(notice.publishedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={notice.clientViewedAt ? "VIEWED" : "PUBLISHED"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/portal/notices/${notice.id}`}
                        className="text-muted-foreground hover:text-brand-navy"
                        title="Open notice"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </Link>
                      <a
                        href={fileUrl(notice.document.id, true)}
                        className="text-muted-foreground hover:text-brand-navy"
                        title="Download"
                      >
                        <Download className="h-4 w-4 inline" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
