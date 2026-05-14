import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { OverdueIndicator } from "@/components/shared/OverdueIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, fileUrl, fileSizeLabel } from "@/lib/utils";
import Link from "next/link";
import { Briefcase, FileText, FolderOpen, Bell, CheckSquare, Download } from "lucide-react";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  BOOKKEEPING: "Bookkeeping",
  TAX_RETURN: "Tax Return",
  PAYROLL: "Payroll",
  CORPORATE_TAX: "Corporate Tax",
  HST_GST_FILING: "HST/GST Filing",
  FINANCIAL_REPORTING: "Financial Reporting",
  CFO_ADVISORY: "CFO Advisory",
  VENTURE_ADVISORY: "Venture Advisory",
};

export async function generateMetadata({ params }: { params: Promise<{ engagementId: string }> }) {
  const { engagementId } = await params;
  const eng = await db.engagement.findUnique({ where: { id: engagementId }, select: { title: true } });
  return { title: eng?.title ?? "Engagement" };
}

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  await requireStaff();
  const { engagementId } = await params;

  const engagement = await db.engagement.findUnique({
    where: { id: engagementId },
    include: {
      client: { select: { id: true, businessName: true } },
      assignedOwner: { select: { name: true } },
      assignedAssistant: { select: { name: true } },
      documentRequests: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      documents: {
        where: { isCurrentVersion: true },
        include: { uploadedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      notices: {
        include: {
          publishedBy: { select: { name: true } },
          document: { select: { id: true, fileName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      tasks: {
        where: { status: { not: "CANCELLED" } },
        include: { assignedTo: { select: { name: true } } },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 10,
      },
    },
  });

  if (!engagement) notFound();

  const period = engagement.reportingPeriodStart && engagement.reportingPeriodEnd
    ? `${formatDate(engagement.reportingPeriodStart)} – ${formatDate(engagement.reportingPeriodEnd)}`
    : engagement.taxYear ? `Tax year ${engagement.taxYear}` : null;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clients" className="hover:text-brand-navy">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${engagement.client.id}`} className="hover:text-brand-navy">{engagement.client.businessName}</Link>
        <span>/</span>
        <span className="text-foreground">{engagement.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 shrink-0">
            <Briefcase className="h-5 w-5 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{engagement.title}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge status={engagement.status} />
              <span className="text-xs text-muted-foreground">{SERVICE_TYPE_LABELS[engagement.serviceType] ?? engagement.serviceType}</span>
              {period && <span className="text-xs text-muted-foreground">· {period}</span>}
            </div>
          </div>
        </div>
        <Link href={`/clients/${engagement.client.id}?tab=engagements`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to client
        </Link>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Owner", value: engagement.assignedOwner.name },
          { label: "Assistant", value: engagement.assignedAssistant?.name ?? "—" },
          { label: "Documents", value: String(engagement.documents.length) },
          { label: "Tasks", value: String(engagement.tasks.length) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-brand-greyBorder bg-white p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {engagement.notes && (
        <SectionCard title="Notes" className="mb-5">
          <p className="text-sm text-foreground whitespace-pre-wrap">{engagement.notes}</p>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Documents */}
        <SectionCard title="Documents" action={<Link href={`/documents?engagementId=${engagement.id}`} className="text-xs text-brand-navy hover:underline">View all</Link>}>
          {engagement.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {engagement.documents.map((doc) => (
                <li key={doc.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{fileSizeLabel(doc.fileSize)} · {formatDate(doc.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={doc.reviewStatus} />
                    <a href={fileUrl(doc.id, true)} className="text-muted-foreground hover:text-brand-navy">
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Requests */}
        <SectionCard title="Document requests">
          {engagement.documentRequests.length === 0 ? (
            <EmptyState icon={FolderOpen} title="No requests" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {engagement.documentRequests.map((req) => (
                <li key={req.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground">{req.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={req.status} />
                    <OverdueIndicator dueDate={req.dueDate} status={req.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Tasks */}
        <SectionCard title="Tasks">
          {engagement.tasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {engagement.tasks.map((task) => (
                <li key={task.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.assignedTo?.name ?? "Unassigned"}
                      {task.dueDate && ` · Due ${formatDate(task.dueDate)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <OverdueIndicator dueDate={task.dueDate} status={task.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Notices */}
        <SectionCard title="Notices & Letters">
          {engagement.notices.length === 0 ? (
            <EmptyState icon={Bell} title="No notices" />
          ) : (
            <ul className="divide-y divide-brand-greyBorder">
              {engagement.notices.map((notice) => (
                <li key={notice.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{notice.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {notice.publishedBy.name}
                      {notice.publishedAt && ` · ${formatDate(notice.publishedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={notice.status} />
                    <a href={fileUrl(notice.document.id, true)} className="text-muted-foreground hover:text-brand-navy">
                      <Download className="h-4 w-4" />
                    </a>
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
