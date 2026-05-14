import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, timeAgo } from "@/lib/utils";
import { PenLine, ExternalLink, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Signature Requests" };

const STATUS_ACTIONS: Record<string, string> = {
  SENT: "Sign now",
  VIEWED: "Continue signing",
};

const STATUS_INFO: Record<string, string> = {
  DRAFT: "Being prepared by your accountant.",
  SENT: "This document is ready for your signature.",
  VIEWED: "You have viewed this — please complete signing.",
  SIGNED: "You have signed this document.",
  EXPIRED: "This signature request has expired. Contact your accountant.",
  CANCELLED: "This request has been cancelled.",
};

export default async function PortalSignaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; signed?: string }>;
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

  const { status, signed } = await searchParams;

  const requests = await db.signatureRequest.findMany({
    where: {
      clientId: scope.clientId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      document: { select: { id: true, title: true } },
      engagement: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const STATUS_OPTS = ["SENT", "VIEWED", "SIGNED", "EXPIRED", "CANCELLED"];

  const pending = requests.filter((r) => ["SENT", "VIEWED"].includes(r.status));
  return (
    <div>
      <PageHeader title="Signature Requests" description={`${requests.length} request${requests.length !== 1 ? "s" : ""}`} />

      {/* Success banner */}
      {signed === "1" && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Document signed successfully</p>
            <p className="text-xs text-green-700 mt-0.5">Your signature has been recorded. Your accountant has been notified.</p>
          </div>
        </div>
      )}

      {/* Action banner */}
      {pending.length > 0 && (
        <div className="mb-5 rounded-lg border border-brand-plum/20 bg-brand-plum/5 px-5 py-4">
          <p className="text-sm font-semibold text-brand-plum">
            {pending.length} document{pending.length > 1 ? "s" : ""} awaiting your signature
          </p>
          <p className="text-xs text-brand-plum/70 mt-0.5">Click &ldquo;Sign now&rdquo; on the item below to proceed.</p>
        </div>
      )}

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {status && (
          <a href="/portal/signatures" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {requests.length === 0 ? (
        <EmptyState icon={PenLine} title="No signature requests" description="Your accountant will send documents for signing here." />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const needsAction = ["SENT", "VIEWED"].includes(req.status);
            return (
              <div
                key={req.id}
                className={`rounded-lg border bg-white shadow-sm p-5 ${needsAction ? "border-brand-plum/30" : "border-brand-greyBorder"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">{req.title}</p>
                      <StatusBadge status={req.status} />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Document: {req.document.title}
                    </p>

                    {req.engagement && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Engagement: {req.engagement.title}
                      </p>
                    )}

                    <p className="text-xs text-brand-navy mt-1.5">
                      {STATUS_INFO[req.status] ?? ""}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      {req.sentAt && <span>Sent {timeAgo(req.sentAt)}</span>}
                      {req.expiresAt && req.status !== "SIGNED" && (
                        <span className={req.status === "EXPIRED" ? "text-red-600" : ""}>
                          Expires {formatDate(req.expiresAt)}
                        </span>
                      )}
                      {req.signedAt && <span>Signed {formatDate(req.signedAt)}</span>}
                    </div>
                  </div>

                  {needsAction && req.providerEnvelopeId && (
                    <a
                      href={`/api/portal/signatures/${req.id}/sign`}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-brand-plum px-4 py-2 text-sm font-medium text-white hover:bg-brand-plum/90"
                    >
                      {STATUS_ACTIONS[req.status]}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
