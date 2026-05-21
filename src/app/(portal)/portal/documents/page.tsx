import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, fileSizeLabel, fileUrl } from "@/lib/utils";
import { FileText, Download, Eye } from "lucide-react";

export const metadata = { title: "My Documents" };

const CATEGORY_LABELS: Record<string, string> = {
  TAX_RETURN: "Tax Return",
  FINANCIAL_STATEMENT: "Financial Statement",
  PAYROLL_REPORT: "Payroll Report",
  RECEIPT: "Receipt",
  INVOICE: "Invoice",
  BANK_STATEMENT: "Bank Statement",
  GOVERNMENT_CORRESPONDENCE: "Government Correspondence",
  ENGAGEMENT_LETTER: "Engagement Letter",
  OTHER: "Other",
};

export default async function PortalDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
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

  const { category } = await searchParams;

  const documents = await db.document.findMany({
    where: {
      clientId: scope.clientId,
      isCurrentVersion: true,
      visibility: "CLIENT_VISIBLE",
      ...(category ? { category: category as never } : {}),
    },
    include: {
      engagement: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const categories = await db.document.findMany({
    where: { clientId: scope.clientId, visibility: "CLIENT_VISIBLE", isCurrentVersion: true },
    select: { category: true },
    distinct: ["category"],
  });
  const availableCategories = categories.map((c) => c.category).filter(Boolean);

  return (
    <div>
      <PageHeader title="My Documents" description={`${documents.length} document${documents.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      {availableCategories.length > 0 && (
        <form className="mb-5 flex flex-wrap gap-3">
          <select name="category" defaultValue={category ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
            <option value="">All categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
          {category && (
            <a href="/portal/documents" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
          )}
        </form>
      )}

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Your accountant will share documents here when they're ready." />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Engagement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Added</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-brand-greyLight/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{doc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fileSizeLabel(doc.fileSize)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                    {doc.engagement?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                    {doc.category ? (CATEGORY_LABELS[doc.category] ?? doc.category) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.reviewStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={fileUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-brand-navy"
                        title="View"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </a>
                      <a
                        href={fileUrl(doc.id, true)}
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
