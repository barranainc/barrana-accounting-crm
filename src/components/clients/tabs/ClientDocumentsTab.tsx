import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, fileSizeLabel } from "@/lib/utils";
import { FileText, ExternalLink } from "lucide-react";

interface ClientDocumentsTabProps {
  clientId: string;
}

export async function ClientDocumentsTab({ clientId }: ClientDocumentsTabProps) {
  const documents = await db.document.findMany({
    where: { clientId, isCurrentVersion: true },
    include: {
      uploadedBy: { select: { name: true } },
      documentRequest: { select: { title: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SectionCard
      title="Documents"
      description={`${documents.length} current document${documents.length !== 1 ? "s" : ""}`}
    >
      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Documents uploaded to this client will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder">
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground">Title</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground">Review</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Visibility</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Uploaded by</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Size</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden xl:table-cell">Date</th>
                <th className="pb-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-brand-greyLight/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div>
                      <span className="font-medium text-foreground">{doc.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{doc.fileName}</p>
                      {doc.documentRequest && (
                        <p className="text-xs text-brand-navy mt-0.5 max-w-xs">
                          For: {doc.documentRequest.title}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell capitalize">
                    {doc.documentRequest?.category ?? doc.category.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={doc.reviewStatus} />
                  </td>
                  <td className="py-3 pr-4 hidden md:table-cell">
                    <StatusBadge status={doc.visibility} />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell">
                    {doc.uploadedBy.name}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell">
                    {fileSizeLabel(doc.fileSize)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden xl:table-cell">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="py-3">
                    <a
                      href={`/api/files/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-brand-navy"
                      title="Open document"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
