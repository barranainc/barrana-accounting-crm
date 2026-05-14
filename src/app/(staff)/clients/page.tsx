import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Users, Plus } from "lucide-react";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireStaff();
  const { q, status } = await searchParams;

  const clients = await db.client.findMany({
    where: {
      ...(status ? { status: status as never } : { status: { not: "ARCHIVED" } }),
      ...(q ? {
        OR: [
          { businessName: { contains: q, mode: "insensitive" } },
          { primaryEmail: { contains: q, mode: "insensitive" } },
          { legalName: { contains: q, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { engagements: true, documentRequests: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const statuses = ["ACTIVE", "ONBOARDING", "INACTIVE", "ARCHIVED"];

  return (
    <div>
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length !== 1 ? "s" : ""}`}
        action={
          <Button asChild size="sm">
            <Link href="/clients/new"><Plus className="h-4 w-4" />New client</Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-48 max-w-xs">
          <Input name="q" defaultValue={q} placeholder="Search clients…" className="pl-3" />
        </form>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/clients"
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!status ? "bg-brand-navy text-white" : "bg-white border border-brand-greyBorder text-muted-foreground hover:bg-brand-greyLight"}`}
          >
            All active
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/clients?status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${status === s ? "bg-brand-navy text-white" : "bg-white border border-brand-greyBorder text-muted-foreground hover:bg-brand-greyLight"}`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={q ? `No clients match "${q}"` : "Create your first client to get started."}
          action={
            <Button asChild size="sm">
              <Link href="/clients/new"><Plus className="h-4 w-4" />New client</Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Engagements</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-brand-greyLight/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-brand-navy">
                      {client.businessName}
                    </Link>
                    {client.flags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {client.flags.map((flag) => (
                          <span key={flag} className="rounded-full bg-brand-plum/10 px-2 py-0 text-xs text-brand-plum capitalize">
                            {flag.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">
                    {client.clientType.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.primaryEmail}</td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{client._count.engagements}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(client.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
