import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { formatDate, fileUrl, fileSizeLabel } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { PenLine, FileText, CheckCircle, AlertCircle } from "lucide-react";

export const metadata = { title: "Sign Document" };

export default async function MockSigningPage({
  params,
}: {
  params: Promise<{ envelopeId: string }>;
}) {
  const session = await requireClientUser();
  const scope = await getPortalScope(session.user.id);

  if (!scope) {
    redirect("/portal/dashboard");
  }

  const { envelopeId } = await params;

  const sigReq = await db.signatureRequest.findFirst({
    where: { providerEnvelopeId: envelopeId },
    include: {
      document: {
        select: { id: true, title: true, fileName: true, fileSize: true, mimeType: true },
      },
      engagement: { select: { id: true, title: true } },
    },
  });

  // 404 if envelope not found or belongs to a different client
  if (!sigReq || sigReq.clientId !== scope.clientId) {
    notFound();
  }

  // If already signed/expired/cancelled, redirect back with status
  if (!["SENT", "VIEWED"].includes(sigReq.status)) {
    redirect(`/portal/signatures?already=${sigReq.status.toLowerCase()}`);
  }

  // Server action — completes the mock signing
  async function completeSigning(formData: FormData) {
    "use server";

    const id = formData.get("sigRequestId") as string;
    if (!id) return;

    // Re-verify session and scope inside the action
    const actionSession = await requireClientUser();
    const actionScope = await getPortalScope(actionSession.user.id);
    if (!actionScope) redirect("/portal/dashboard");

    const req = await db.signatureRequest.findUnique({ where: { id } });
    if (!req || req.clientId !== actionScope.clientId) redirect("/portal/signatures");
    if (!["SENT", "VIEWED"].includes(req.status)) redirect("/portal/signatures");

    await db.signatureRequest.update({
      where: { id },
      data: { status: "SIGNED", signedAt: new Date() },
    });

    await createAuditEvent({
      action: AuditAction.SIGNATURE_REQUEST_SIGNED,
      actorUserId: actionSession.user.id,
      clientId: req.clientId,
      entityType: "SignatureRequest",
      entityId: id,
      metadata: { provider: req.provider },
    });

    // Notify staff
    const staffUsers = await db.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "CPA_ADMIN", "ASSISTANT"] }, status: "ACTIVE" },
      select: { id: true },
    });
    for (const u of staffUsers) {
      await createNotification({
        userId: u.id,
        title: "Document signed",
        body: req.title,
        link: `/signatures`,
      });
    }

    revalidatePath("/signatures");
    revalidatePath(`/clients/${req.clientId}`);
    redirect("/portal/signatures?signed=1");
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-plum/10 shrink-0">
            <PenLine className="h-5 w-5 text-brand-plum" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{sigReq.title}</h1>
            <p className="text-sm text-muted-foreground">{scope.client.businessName}</p>
          </div>
        </div>
        {sigReq.engagement && (
          <p className="text-xs text-muted-foreground mt-1 ml-13 pl-13">
            Engagement: {sigReq.engagement.title}
          </p>
        )}
      </div>

      {/* Demo notice */}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Demo environment.</span> In production, this page would be
          hosted by your e-signature provider (DocuSign, Dropbox Sign, etc.). Click
          &ldquo;Confirm signature&rdquo; below to simulate completing the signing process.
        </p>
      </div>

      {/* Document card */}
      <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-navy/5 shrink-0">
            <FileText className="h-6 w-6 text-brand-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{sigReq.document.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sigReq.document.fileName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fileSizeLabel(sigReq.document.fileSize)}
              {sigReq.expiresAt && ` · Expires ${formatDate(sigReq.expiresAt)}`}
            </p>
          </div>
          <a
            href={fileUrl(sigReq.document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-brand-navy hover:underline"
          >
            View document
          </a>
        </div>

        {sigReq.message && (
          <div className="mt-4 pt-4 border-t border-brand-greyBorder">
            <p className="text-xs font-medium text-muted-foreground mb-1">Message from your accountant</p>
            <p className="text-sm text-foreground">{sigReq.message}</p>
          </div>
        )}
      </div>

      {/* Signing form */}
      <div className="rounded-lg border border-brand-plum/20 bg-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="h-4 w-4 text-brand-plum" />
          <p className="text-sm font-semibold">Sign this document</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          By clicking &ldquo;Confirm signature&rdquo; below, you agree that you have read and accept
          the contents of <span className="font-medium">{sigReq.document.title}</span>. This action
          will be recorded and cannot be undone.
        </p>

        <form action={completeSigning}>
          <input type="hidden" name="sigRequestId" value={sigReq.id} />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-brand-plum px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-plum/90 transition-colors"
            >
              <PenLine className="h-4 w-4" />
              Confirm signature
            </button>
            <Link
              href="/portal/signatures"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Signed on behalf of {scope.client.businessName} · {formatDate(new Date())}
      </p>
    </div>
  );
}
