import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, isOverdue } from "@/lib/utils";
import { Inbox, AlertCircle } from "lucide-react";

interface ClientRequestsTabProps {
  clientId: string;
}

export async function ClientRequestsTab({ clientId }: ClientRequestsTabProps) {
  const requests = await db.documentRequest.findMany({
    where: { clientId },
    include: {
      requestedBy: { select: { name: true } },
      engagement: { select: { title: true } },
      _count: { select: { documents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SectionCard
      title="Document Requests"
      description={`${requests.length} request${requests.length !== 1 ? "s" : ""}`}
    >
      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No document requests"
          description="Document requests for this client will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder">
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground">Title</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Priority</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Due date</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden xl:table-cell">Engagement</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden xl:table-cell">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {requests.map((req) => {
                const overdue = isOverdue(req.dueDate, req.status);
                return (
                  <tr key={req.id} className="hover:bg-brand-greyLight/50 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-foreground">{req.title}</span>
                      {req.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{req.description}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell capitalize">
                      {req.category.replace(/_/g, " ").toLowerCase()}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      {req.dueDate ? (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {overdue && <AlertCircle className="h-3 w-3" />}
                          {formatDate(req.dueDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground hidden xl:table-cell">
                      {req.engagement?.title ?? "—"}
                    </td>
                    <td className="py-3 text-muted-foreground hidden xl:table-cell">
                      {req._count.documents}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
