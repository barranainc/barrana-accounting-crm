import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { OverdueIndicator } from "@/components/shared/OverdueIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { FolderOpen } from "lucide-react";

export const metadata = { title: "Document Requests" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; clientId?: string }>;
}) {
  await requireStaff();
  const { status, priority, clientId } = await searchParams;

  const requests = await db.documentRequest.findMany({
    where: {
      status: status ? (status as never) : { not: "ARCHIVED" },
      ...(priority ? { priority: priority as never } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: { select: { id: true, businessName: true } },
      requestedBy: { select: { name: true } },
      engagement: { select: { id: true, title: true } },
      _count: { select: { documents: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const STATUS_OPTS = ["REQUESTED","UPLOADED","UNDER_REVIEW","ACCEPTED","REJECTED","NEEDS_REPLACEMENT","ARCHIVED"];
  const PRIORITY_OPTS = ["LOW","MEDIUM","HIGH","URGENT"];

  return (
    <div>
      <PageHeader
        title="Document requests"
        description={`${requests.length} request${requests.length !== 1 ? "s" : ""}`}
      />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All priorities</option>
          {PRIORITY_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {(status || priority) && (
          <Link href="/documents/requests" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</Link>
        )}
      </form>

      {requests.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No requests found" />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Request</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Engagement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Docs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-brand-greyLight/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{req.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link href={`/clients/${req.client.id}?tab=requests`} className="text-muted-foreground hover:text-brand-navy">
                      {req.client.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {req.engagement ? (
                      <Link href={`/engagements/${req.engagement.id}`} className="hover:text-brand-navy">
                        {req.engagement.title}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><PriorityBadge priority={req.priority} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{req._count.documents}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs">{req.dueDate ? formatDate(req.dueDate) : "—"}</span>
                      <OverdueIndicator dueDate={req.dueDate} status={req.status} />
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
