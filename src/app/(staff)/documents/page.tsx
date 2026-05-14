import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, fileSizeLabel, fileUrl } from "@/lib/utils";
import { FileText, ExternalLink, Download } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; reviewStatus?: string; visibility?: string; clientId?: string }>;
}) {
  await requireStaff();
  const { q, reviewStatus, visibility, clientId } = await searchParams;

  const documents = await db.document.findMany({
    where: {
      isCurrentVersion: true,
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { fileName: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
      ...(reviewStatus ? { reviewStatus: reviewStatus as never } : {}),
      ...(visibility ? { visibility: visibility as never } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: { select: { id: true, businessName: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Documents" description={`${documents.length} document${documents.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search documents…"
          className="h-9 flex-1 min-w-48 max-w-xs rounded-md border border-brand-greyBorder bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-navy"
        />
        <select name="reviewStatus" defaultValue={reviewStatus ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All review statuses</option>
          {["UNREVIEWED","UNDER_REVIEW","ACCEPTED","REJECTED","NEEDS_REPLACEMENT"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g," ")}</option>
          ))}
        </select>
        <select name="visibility" defaultValue={visibility ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All visibility</option>
          <option value="INTERNAL">Internal</option>
          <option value="CLIENT_VISIBLE">Client visible</option>
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {(q || reviewStatus || visibility) && (
          <a href="/documents" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents found" />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Visibility</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Uploaded</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-brand-greyLight/50">
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:text-brand-navy">
                        {doc.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.fileName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link href={`/clients/${doc.client.id}`} className="text-muted-foreground hover:text-brand-navy">
                      {doc.client.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{doc.category}</td>
                  <td className="px-4 py-3"><StatusBadge status={doc.reviewStatus} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={doc.visibility} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{fileSizeLabel(doc.fileSize)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a href={fileUrl(doc.id)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-navy" title="View">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a href={fileUrl(doc.id, true)} className="text-muted-foreground hover:text-brand-navy" title="Download">
                        <Download className="h-4 w-4" />
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
