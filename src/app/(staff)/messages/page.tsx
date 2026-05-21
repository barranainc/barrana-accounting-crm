import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; threadType?: string }>;
}) {
  await requireStaff();
  const { status, threadType } = await searchParams;

  const threads = await db.messageThread.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(threadType ? { threadType: threadType as never } : {}),
    },
    include: {
      client: { select: { id: true, businessName: true } },
      engagement: { select: { id: true, title: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const STATUS_OPTS = ["OPEN","WAITING_ON_STAFF","WAITING_ON_CLIENT","CLOSED"];

  return (
    <div>
      <PageHeader title="Messages" description={`${threads.length} thread${threads.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
        <select name="threadType" defaultValue={threadType ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All types</option>
          <option value="CLIENT_STAFF">Client ↔ Staff</option>
          <option value="INTERNAL">Internal</option>
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {(status || threadType) && (
          <Link href="/messages" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</Link>
        )}
      </form>

      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No message threads" />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm divide-y divide-brand-greyBorder">
          {threads.map((thread) => {
            const last = thread.messages[0];
            const isInternal = thread.threadType === "INTERNAL";
            return (
              <Link key={thread.id} href={`/messages/${thread.id}`} className="block px-5 py-4 hover:bg-brand-greyLight/40 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {thread.subject ?? "Untitled thread"}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isInternal ? "bg-brand-plum/10 text-brand-plum" : "bg-brand-navy/10 text-brand-navy"}`}>
                        {isInternal ? "Internal" : "Client ↔ Staff"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Link href={`/clients/${thread.client.id}`} className="hover:text-brand-navy font-medium">
                        {thread.client.businessName}
                      </Link>
                      {thread.engagement && (
                        <><span>·</span><span>{thread.engagement.title}</span></>
                      )}
                    </div>
                    {last && (
                      <p className="mt-1.5 text-xs text-muted-foreground truncate">
                        <span className="font-medium">{last.author.name}:</span>{" "}
                        {last.body.slice(0, 100)}{last.body.length > 100 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={thread.status} />
                    <span className="text-xs text-muted-foreground">{timeAgo(thread.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
