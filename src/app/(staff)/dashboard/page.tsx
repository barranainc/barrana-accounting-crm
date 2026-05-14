import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, timeAgo, isOverdue } from "@/lib/utils";
import Link from "next/link";
import {
  FileText, MessageSquare, PenLine, CheckSquare,
  AlertTriangle, Upload, Users, Inbox,
} from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function StaffDashboardPage() {
  await requireStaff();
  const now = new Date();

  const [
    documentsForReview,
    pendingRequests,
    overdueTasks,
    recentUploads,
    recentMessages,
    pendingSignatures,
    clientCount,
  ] = await Promise.all([
    // Documents needing staff review
    db.document.findMany({
      where: { reviewStatus: { in: ["UNREVIEWED", "UNDER_REVIEW"] }, isCurrentVersion: true },
      include: { client: { select: { businessName: true } }, uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),

    // Open document requests — what clients still owe
    db.documentRequest.findMany({
      where: { status: { in: ["REQUESTED", "NEEDS_REPLACEMENT"] } },
      include: { client: { select: { businessName: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),

    // Overdue tasks
    db.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      include: {
        client: { select: { businessName: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),

    // Recent uploads (all clients, last 24h)
    db.document.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
      include: { client: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),

    // Recent message threads with new messages
    db.messageThread.findMany({
      where: { threadType: "CLIENT_STAFF", status: { in: ["OPEN", "WAITING_ON_STAFF"] } },
      include: {
        client: { select: { businessName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),

    // Pending signature requests
    db.signatureRequest.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { client: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),

    db.client.count({ where: { status: { not: "ARCHIVED" } } }),
  ]);

  const overdueCount = overdueTasks.length;
  const reviewCount = documentsForReview.length;
  const sigCount = pendingSignatures.length;

  return (
    <div>
      <PageHeader
        title={`Good morning`}
        description="Here's what needs your attention today."
      />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Docs to Review", value: reviewCount, icon: FileText, href: "/documents", accent: reviewCount > 0 },
          { label: "Overdue Tasks",  value: overdueCount, icon: AlertTriangle, href: "/tasks", accent: overdueCount > 0 },
          { label: "Pending Signatures", value: sigCount, icon: PenLine, href: "/signatures", accent: false },
          { label: "Active Clients", value: clientCount, icon: Users, href: "/clients", accent: false },
        ].map(({ label, value, icon: Icon, href, accent }) => (
          <Link key={href} href={href}>
            <div className={`rounded-lg border bg-white shadow-sm p-4 hover:shadow-md transition-shadow ${accent && value > 0 ? "border-brand-plum/30" : "border-brand-greyBorder"}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${accent && value > 0 ? "bg-brand-plum/10" : "bg-brand-greyLight"}`}>
                  <Icon className={`h-4 w-4 ${accent && value > 0 ? "text-brand-plum" : "text-brand-grey"}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${accent && value > 0 ? "text-brand-plum" : "text-foreground"}`}>{value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Documents needing review */}
        <SectionCard
          title="Needs review"
          description="Documents waiting for your decision"
          action={<Link href="/documents" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {documentsForReview.length === 0 ? (
            <EmptyState icon={FileText} title="All caught up" description="No documents waiting for review." />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {documentsForReview.map((doc) => (
                <li key={doc.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/documents/${doc.id}`} className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.client.businessName} · {timeAgo(doc.createdAt)}</p>
                    </div>
                    <StatusBadge status={doc.reviewStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Overdue tasks */}
        <SectionCard
          title="Overdue tasks"
          action={<Link href="/tasks" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {overdueTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Nothing overdue" description="All tasks are on track." />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {overdueTasks.map((task) => (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-red-700">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.client?.businessName ?? "General"} · Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Waiting on client */}
        <SectionCard
          title="Waiting on client"
          description="Requests the client hasn't fulfilled"
          action={<Link href="/documents/requests" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {pendingRequests.length === 0 ? (
            <EmptyState icon={Inbox} title="No pending requests" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {pendingRequests.map((req) => (
                <li key={req.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{req.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.client.businessName}
                        {req.dueDate && ` · Due ${formatDate(req.dueDate)}`}
                        {isOverdue(req.dueDate, req.status) && <span className="ml-1 text-red-600 font-medium">Overdue</span>}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent messages */}
        <SectionCard
          title="Recent messages"
          action={<Link href="/messages" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {recentMessages.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No unread messages" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {recentMessages.map((thread) => (
                <li key={thread.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/messages?thread=${thread.id}`} className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">
                        {thread.subject ?? "Message thread"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {thread.client.businessName} · {thread.messages[0]?.author.name} · {timeAgo(thread.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={thread.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Pending signatures */}
        <SectionCard
          title="Pending signatures"
          action={<Link href="/signatures" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {pendingSignatures.length === 0 ? (
            <EmptyState icon={PenLine} title="No pending signatures" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {pendingSignatures.map((sig) => (
                <li key={sig.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{sig.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sig.client.businessName} · Sent {timeAgo(sig.sentAt ?? sig.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={sig.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent uploads */}
        <SectionCard
          title="Recent uploads"
          description="Documents uploaded in the last 24 hours"
          action={<Link href="/documents" className="text-xs text-brand-navy hover:underline">View all</Link>}
        >
          {recentUploads.length === 0 ? (
            <EmptyState icon={Upload} title="No recent uploads" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {recentUploads.map((doc) => (
                <li key={doc.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/documents/${doc.id}`} className="flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-brand-navy">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.client.businessName} · {timeAgo(doc.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={doc.visibility} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
