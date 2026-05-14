import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { formatDate, timeAgo } from "@/lib/utils";
import Link from "next/link";
import { FolderOpen, FileText, PenLine, MessageSquare, Bell, Briefcase } from "lucide-react";

export const metadata = { title: "My Portal" };

export default async function ClientDashboardPage() {
  const session = await requireClientUser();

  const scope = await getPortalScope(session.user.id);

  if (!scope) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Your account is not linked to a client. Please contact your accountant.</p>
      </div>
    );
  }

  const { clientId, client } = scope;

  const [
    openRequests,
    recentDocuments,
    pendingSignatures,
    recentMessages,
    recentNotices,
    activeEngagements,
  ] = await Promise.all([
    // What we need from you
    db.documentRequest.findMany({
      where: {
        clientId,
        status: { in: ["REQUESTED", "NEEDS_REPLACEMENT", "UPLOADED", "UNDER_REVIEW"] },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),

    // Recent uploads
    db.document.findMany({
      where: { clientId, isCurrentVersion: true, visibility: "CLIENT_VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Pending signatures
    db.signatureRequest.findMany({
      where: { clientId, status: { in: ["SENT", "VIEWED"] } },
      orderBy: { sentAt: "desc" },
      take: 4,
    }),

    // Recent messages (client-staff only, non-internal)
    db.messageThread.findMany({
      where: { clientId, threadType: "CLIENT_STAFF", status: { not: "CLOSED" } },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { author: { select: { name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),

    // Latest notices
    db.noticeLetter.findMany({
      where: { clientId, status: { in: ["PUBLISHED", "VIEWED"] } },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),

    // Active engagements
    db.engagement.findMany({
      where: { clientId, status: { in: ["ACTIVE", "WAITING_ON_CLIENT", "IN_REVIEW"] } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const actionRequired = openRequests.filter((r) => ["REQUESTED", "NEEDS_REPLACEMENT"].includes(r.status));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${session.user.name?.split(" ")[0]}`}
        description={client.businessName}
      />

      {/* Action banner */}
      {actionRequired.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {actionRequired.length} item{actionRequired.length > 1 ? "s" : ""} need{actionRequired.length === 1 ? "s" : ""} your attention
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your accountant is waiting for documents from you.
              </p>
            </div>
            <Button asChild variant="accent" size="sm">
              <Link href="/portal/requests">View requests</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* What we need from you */}
        <SectionCard
          title="What we need from you"
          action={<Link href="/portal/requests" className="text-xs text-brand-navy hover:underline">All requests</Link>}
        >
          {openRequests.length === 0 ? (
            <EmptyState icon={FolderOpen} title="You're all caught up" description="No outstanding document requests." />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {openRequests.map((req) => (
                <li key={req.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href="/portal/requests" className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">{req.title}</p>
                      {req.dueDate && (
                        <p className="text-xs text-muted-foreground">Due {formatDate(req.dueDate)}</p>
                      )}
                    </div>
                    <StatusBadge status={req.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Pending signatures */}
        <SectionCard
          title="Signature requests"
          action={<Link href="/portal/signatures" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {pendingSignatures.length === 0 ? (
            <EmptyState icon={PenLine} title="No pending signatures" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {pendingSignatures.map((sig) => (
                <li key={sig.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/portal/signatures`} className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">{sig.title}</p>
                      <p className="text-xs text-muted-foreground">Sent {timeAgo(sig.sentAt ?? sig.createdAt)}</p>
                    </div>
                    <StatusBadge status={sig.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent messages */}
        <SectionCard
          title="Messages"
          action={<Link href="/portal/messages" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {recentMessages.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No messages yet" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {recentMessages.map((thread) => (
                <li key={thread.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href="/portal/messages" className="block group">
                    <p className="truncate text-sm font-medium group-hover:text-brand-navy">
                      {thread.subject ?? "Message from your accountant"}
                    </p>
                    {thread.messages[0] && (
                      <p className="truncate text-xs text-muted-foreground mt-0.5">
                        {thread.messages[0].author.name}: {thread.messages[0].body.slice(0, 60)}…
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Latest notices */}
        <SectionCard
          title="Notices & letters"
          action={<Link href="/portal/notices" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {recentNotices.length === 0 ? (
            <EmptyState icon={Bell} title="No notices yet" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {recentNotices.map((notice) => (
                <li key={notice.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href="/portal/notices" className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">{notice.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {notice.publishedAt ? formatDate(notice.publishedAt) : "—"}
                      </p>
                    </div>
                    <StatusBadge status={notice.clientViewedAt ? "VIEWED" : "PUBLISHED"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent documents */}
        <SectionCard
          title="Recent documents"
          action={<Link href="/portal/documents" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {recentDocuments.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {recentDocuments.map((doc) => (
                <li key={doc.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/portal/documents`} className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(doc.createdAt)}</p>
                    </div>
                    <StatusBadge status={doc.reviewStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Engagements */}
        <SectionCard
          title="Your engagements"
        >
          {activeEngagements.length === 0 ? (
            <EmptyState icon={Briefcase} title="No active engagements" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {activeEngagements.map((eng) => (
                <li key={eng.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{eng.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {eng.serviceType.replace(/_/g, " ").toLowerCase()}
                        {eng.taxYear ? ` · ${eng.taxYear}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={eng.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
