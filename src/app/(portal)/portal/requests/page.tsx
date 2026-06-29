import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { uploadDocument } from "@/actions/documents";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OverdueIndicator } from "@/components/shared/OverdueIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { FolderOpen, Upload } from "lucide-react";

export const metadata = { title: "Document Requests" };

const STATUS_DESCRIPTIONS: Record<string, string> = {
  REQUESTED: "Your accountant needs this document from you.",
  NEEDS_REPLACEMENT: "The document you uploaded needs to be replaced.",
  UPLOADED: "You've submitted this. Your accountant is reviewing it.",
  UNDER_REVIEW: "Your accountant is reviewing this document.",
  ACCEPTED: "Your accountant has accepted this document.",
  REJECTED: "This document was rejected. Please re-upload.",
  WAIVED: "This request has been waived.",
};

export default async function PortalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireClientUser();
  const scope = await getPortalScope(session.user.id);

  if (!scope) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Your account is not linked to a client. Please contact your accountant.</p>
      </div>
    );
  }

  const { status } = await searchParams;

  async function handleUpload(formData: FormData) {
    "use server";
    const file = formData.get("file") as File | null;
    const requestId = formData.get("requestId") as string;
    const clientId = formData.get("clientId") as string;
    if (!file || !requestId || !clientId || file.size === 0) return;
    const bytes = await file.arrayBuffer();
    await uploadDocument({
      clientId,
      documentRequestId: requestId,
      title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      documentType: "OTHER",
      category: "GENERAL",
      visibility: "CLIENT_VISIBLE",
      fileBuffer: Buffer.from(bytes),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    });
    revalidatePath("/portal/requests");
  }

  const requests = await db.documentRequest.findMany({
    where: {
      clientId: scope.clientId,
      status: status ? (status as never) : { not: "ARCHIVED" },
    },
    include: {
      engagement: { select: { id: true, title: true } },
      documents: {
        where: { isCurrentVersion: true },
        select: { id: true, title: true, reviewStatus: true, createdAt: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const STATUS_OPTS = ["REQUESTED","NEEDS_REPLACEMENT","UPLOADED","UNDER_REVIEW","ACCEPTED","REJECTED","WAIVED"];

  const actionNeeded = requests.filter((r) => ["REQUESTED", "NEEDS_REPLACEMENT", "REJECTED"].includes(r.status));
  const inProgress = requests.filter((r) => ["UPLOADED", "UNDER_REVIEW"].includes(r.status));
  const completed = requests.filter((r) => ["ACCEPTED", "WAIVED"].includes(r.status));

  const grouped = status
    ? [{ label: "Results", items: requests }]
    : [
        { label: "Action required", items: actionNeeded },
        { label: "In progress", items: inProgress },
        { label: "Completed", items: completed },
      ].filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader title="Document Requests" description={`${requests.length} request${requests.length !== 1 ? "s" : ""}`} />

      {/* Filter */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s === "UPLOADED" ? "Submitted" : s.replace(/_/g, " ")}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {status && (
          <a href="/portal/requests" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {requests.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No document requests" description="Your accountant will add requests here when they need documents from you." />
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <SectionCard key={group.label} title={group.label}>
              <ul className="divide-y divide-brand-greyBorder">
                {group.items.map((req) => (
                  <li key={req.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{req.title}</p>
                          <StatusBadge status={req.status} />
                          <OverdueIndicator dueDate={req.dueDate} status={req.status} />
                        </div>
                        {req.category && (
                          <p className="text-xs text-muted-foreground mt-0.5">{req.category}</p>
                        )}
                        {req.description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{req.description}</p>
                        )}
                        <p className="text-xs text-brand-navy mt-1">
                          {STATUS_DESCRIPTIONS[req.status] ?? ""}
                        </p>
                        {req.dueDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due {formatDate(req.dueDate)}
                          </p>
                        )}
                        {req.engagement && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Engagement: {req.engagement.title}
                          </p>
                        )}
                        {req.documents.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {req.documents.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{doc.title}</span>
                                <StatusBadge status={doc.reviewStatus} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {["REQUESTED", "NEEDS_REPLACEMENT", "REJECTED"].includes(req.status) && (
                      <form action={handleUpload} className="mt-3 pt-3 border-t border-brand-greyBorder">
                        <input type="hidden" name="requestId" value={req.id} />
                        <input type="hidden" name="clientId" value={scope.clientId} />
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          Upload document
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <input
                            type="file"
                            name="file"
                            required
                            accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg"
                            className="text-xs text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-brand-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-brand-navyDark"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-brand-navy px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-navyDark transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
