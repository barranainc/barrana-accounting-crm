import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { PenLine } from "lucide-react";

export const metadata = { title: "Signature Requests" };

export default async function SignaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status } = await searchParams;

  const requests = await db.signatureRequest.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
    },
    include: {
      client: { select: { id: true, businessName: true } },
      requestedBy: { select: { name: true } },
      document: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const STATUS_OPTS = ["DRAFT","SENT","VIEWED","SIGNED","EXPIRED","CANCELLED"];

  return (
    <div>
      <PageHeader title="Signature Requests" description={`${requests.length} request${requests.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {status && (
          <a href="/signatures" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {requests.length === 0 ? (
        <EmptyState icon={PenLine} title="No signature requests" />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Request</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Signed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-brand-greyLight/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Provider: {req.provider}
                      {req.expiresAt && ` · Expires ${formatDate(req.expiresAt)}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Link href={`/clients/${req.client.id}?tab=signatures`} className="text-muted-foreground hover:text-brand-navy">
                      {req.client.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate max-w-xs">
                    {req.document.title}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {req.sentAt ? timeAgo(req.sentAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {req.signedAt ? formatDate(req.signedAt) : "—"}
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
