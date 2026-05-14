import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";

interface ClientEngagementsTabProps {
  clientId: string;
}

export async function ClientEngagementsTab({ clientId }: ClientEngagementsTabProps) {
  const engagements = await db.engagement.findMany({
    where: { clientId },
    include: {
      assignedOwner: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SectionCard title="Engagements" description={`${engagements.length} engagement${engagements.length !== 1 ? "s" : ""}`}>
      {engagements.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No engagements yet"
          description="Engagements track ongoing work for this client."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder">
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground">Title</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Service</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Tax year</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Owner</th>
                <th className="pb-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="pb-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {engagements.map((eng) => (
                <tr key={eng.id} className="hover:bg-brand-greyLight/50 transition-colors">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/engagements/${eng.id}`}
                      className="font-medium text-foreground hover:text-brand-navy"
                    >
                      {eng.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell capitalize">
                    {eng.serviceType.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={eng.status} />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                    {eng.taxYear ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell">
                    {eng.assignedOwner.name}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell">
                    {formatDate(eng.createdAt)}
                  </td>
                  <td className="py-3">
                    <Link href={`/engagements/${eng.id}`} className="text-muted-foreground hover:text-brand-navy">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
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
