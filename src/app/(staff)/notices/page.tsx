import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { publishNotice } from "@/actions/notices";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, fileUrl } from "@/lib/utils";
import Link from "next/link";
import { Bell, Download, Send } from "lucide-react";

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

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; noticeType?: string }>;
}) {
  await requireStaff();
  const { status, noticeType } = await searchParams;

  async function handlePublish(formData: FormData) {
    "use server";
    const noticeId = formData.get("noticeId") as string;
    if (!noticeId) return;
    await publishNotice(noticeId);
  }

  const notices = await db.noticeLetter.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(noticeType ? { noticeType: noticeType as never } : {}),
    },
    include: {
      client: { select: { id: true, businessName: true } },
      publishedBy: { select: { name: true } },
      document: { select: { id: true, fileName: true, visibility: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Notices & Letters" description={`${notices.length} notice${notices.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {["DRAFT","PUBLISHED","VIEWED","SUPERSEDED","ARCHIVED"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="noticeType" defaultValue={noticeType ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All types</option>
          {Object.entries(NOTICE_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {(status || noticeType) && (
          <a href="/notices" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {notices.length === 0 ? (
        <EmptyState icon={Bell} title="No notices found" />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Notice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Published</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Viewed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {notices.map((notice) => (
                <tr key={notice.id} className="hover:bg-brand-greyLight/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{notice.title}</p>
                    {notice.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{notice.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link href={`/clients/${notice.client.id}?tab=notices`} className="text-muted-foreground hover:text-brand-navy">
                      {notice.client.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {NOTICE_TYPE_LABELS[notice.noticeType] ?? notice.noticeType}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={notice.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {notice.publishedAt ? formatDate(notice.publishedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {notice.clientViewedAt ? formatDate(notice.clientViewedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {notice.status === "DRAFT" && notice.document.visibility === "CLIENT_VISIBLE" && (
                        <form action={handlePublish}>
                          <input type="hidden" name="noticeId" value={notice.id} />
                          <button
                            type="submit"
                            title="Publish notice to client"
                            className="inline-flex items-center gap-1 rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                          >
                            <Send className="h-3 w-3" />
                            Publish
                          </button>
                        </form>
                      )}
                      {notice.status === "DRAFT" && notice.document.visibility !== "CLIENT_VISIBLE" && (
                        <span className="text-xs text-amber-600" title="Make the linked document client-visible to publish this notice">
                          Doc is internal
                        </span>
                      )}
                      <a href={fileUrl(notice.document.id, true)} className="text-muted-foreground hover:text-brand-navy" title="Download">
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
