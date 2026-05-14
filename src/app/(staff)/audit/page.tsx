import { requireAdmin } from "@/lib/permissions"; // CPA_ADMIN + SUPER_ADMIN only
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Audit Log" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>;
}) {
  await requireAdmin(); // blocks ASSISTANT at page level (middleware blocks too)

  const { action, entityType } = await searchParams;

  const events = await db.auditEvent.findMany({
    where: {
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      ...(entityType ? { entityType: { equals: entityType, mode: "insensitive" } } : {}),
    },
    include: {
      actor: { select: { name: true, role: true } },
      client: { select: { businessName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entityTypes = await db.auditEvent.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });

  return (
    <div>
      <PageHeader title="Audit Log" description="System-wide record of all significant actions." />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          name="action"
          defaultValue={action}
          placeholder="Filter by action…"
          className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-navy"
        />
        <select
          name="entityType"
          defaultValue={entityType ?? ""}
          className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-navy"
        >
          <option value="">All entity types</option>
          {entityTypes.map((e) => (
            <option key={e.entityType} value={e.entityType}>{e.entityType}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
        >
          Filter
        </button>
        {(action || entityType) && (
          <a
            href="/audit"
            className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      {events.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No audit events" description="Events will appear here as users take actions." />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Entity</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden lg:table-cell">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">Actor</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-brand-greyLight/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-foreground">{event.action}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
                    <span>{event.entityType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                    {event.client?.businessName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {event.actor?.name ?? "System"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(event.createdAt)}
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
