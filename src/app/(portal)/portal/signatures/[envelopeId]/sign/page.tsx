import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { formatDate, fileUrl, fileSizeLabel } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { SignDocumentForm } from "@/components/signatures/SignDocumentForm";
import { PenLine, FileText } from "lucide-react";

export const metadata = { title: "Sign Document" };

export default async function SignDocumentPage({
  params,
}: {
  params: Promise<{ envelopeId: string }>;
}) {
  const session = await requireClientUser();
  const scope = await getPortalScope(session.user.id);
  if (!scope) redirect("/portal/dashboard");

  const { envelopeId } = await params;

  const sigReq = await db.signatureRequest.findFirst({
    where: { providerEnvelopeId: envelopeId },
    include: {
      document: { select: { id: true, title: true, fileName: true, fileSize: true } },
      engagement: { select: { id: true, title: true } },
    },
  });

  if (!sigReq || sigReq.clientId !== scope.clientId) notFound();
  if (!["SENT", "VIEWED"].includes(sigReq.status)) {
    redirect(`/portal/signatures?already=${sigReq.status.toLowerCase()}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-plum/10 shrink-0">
            <PenLine className="h-5 w-5 text-brand-plum" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{sigReq.title}</h1>
            <p className="text-sm text-muted-foreground">{scope.client.businessName}</p>
          </div>
        </div>
        {sigReq.engagement && (
          <p className="ml-13 text-xs text-muted-foreground">Engagement: {sigReq.engagement.title}</p>
        )}
      </div>

      {/* Document card */}
      <div className="mb-5 rounded-lg border border-brand-greyBorder bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-navy/5 shrink-0">
            <FileText className="h-6 w-6 text-brand-navy" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{sigReq.document.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sigReq.document.fileName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fileSizeLabel(sigReq.document.fileSize)}
              {sigReq.expiresAt && ` · Expires ${formatDate(sigReq.expiresAt)}`}
            </p>
          </div>
          <a
            href={fileUrl(sigReq.document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-brand-navy hover:underline"
          >
            Review document
          </a>
        </div>

        {sigReq.message && (
          <div className="mt-4 border-t border-brand-greyBorder pt-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Message from your accountant</p>
            <p className="text-sm text-foreground">{sigReq.message}</p>
          </div>
        )}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Please review the document above, then sign below. Your signature is recorded with a timestamp and
        audit trail.
      </p>

      <SignDocumentForm
        sigRequestId={sigReq.id}
        documentTitle={sigReq.document.title}
        defaultName={session.user.name ?? ""}
      />
    </div>
  );
}
