import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export async function ClientAuditTab({ clientId }: { clientId: string }) {
  const events = await db.auditEvent.findMany({
    where: { clientId },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <SectionCard title="Audit history" description="Last 50 events for this client">
      {events.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audit events" description="Actions on this client will be recorded here." />
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-brand-greyBorder">
              <th className="pb-2 text-left font-semibold text-muted-foreground">Action</th>
              <th className="pb-2 text-left font-semibold text-muted-foreground hidden md:table-cell">Entity</th>
              <th className="pb-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">Actor</th>
              <th className="pb-2 text-left font-semibold text-muted-foreground">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-greyBorder">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-brand-greyLight/50">
                <td className="py-2.5 pr-3 font-mono text-foreground">{event.action}</td>
                <td className="py-2.5 pr-3 text-muted-foreground hidden md:table-cell">
                  {event.entityType}
                </td>
                <td className="py-2.5 pr-3 text-muted-foreground hidden sm:table-cell">
                  {event.actor?.name ?? "System"}
                </td>
                <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                  {formatDateTime(event.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}
