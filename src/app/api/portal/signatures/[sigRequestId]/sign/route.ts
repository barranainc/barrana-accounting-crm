import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { signatureProvider } from "@/lib/signatures";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";

// GET /api/portal/signatures/[sigRequestId]/sign
//
// Generates a fresh signing URL on demand and redirects the user to it.
// This endpoint must never return a stored URL — real providers (DocuSign,
// Dropbox Sign) generate time-limited URLs here. The mock provider returns
// our own portal signing page. Either way, the URL is not persisted.
//
// For DocuSign: call the "create recipient view" API with providerEnvelopeId
//   → get a ~5-minute URL → redirect
// For mock: return /portal/signatures/{envelopeId}/sign
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sigRequestId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { sigRequestId } = await params;

  const sigReq = await db.signatureRequest.findUnique({
    where: { id: sigRequestId },
  });

  if (!sigReq) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Staff cannot sign on behalf of a client
  if (isStaff(session.user.role)) {
    return NextResponse.json({ error: "Staff cannot access client signing flow" }, { status: 403 });
  }

  // Client must be linked to this request's client
  const link = await db.clientUserLink.findUnique({
    where: { userId_clientId: { userId: session.user.id, clientId: sigReq.clientId } },
  });
  if (!link) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 403 });
  }

  if (!["SENT", "VIEWED"].includes(sigReq.status)) {
    return NextResponse.redirect(new URL("/portal/signatures", _req.url));
  }

  if (!sigReq.providerEnvelopeId) {
    return NextResponse.json({ error: "Envelope not yet created" }, { status: 400 });
  }

  // Mark as VIEWED if still SENT
  if (sigReq.status === "SENT") {
    await db.signatureRequest.update({
      where: { id: sigRequestId },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
    await createAuditEvent({
      action: AuditAction.SIGNATURE_REQUEST_VIEWED,
      actorUserId: session.user.id,
      clientId: sigReq.clientId,
      entityType: "SignatureRequest",
      entityId: sigRequestId,
    });
  }

  // Ask the provider for a fresh signing URL — never stored
  const viewUrl = await signatureProvider.getViewUrl(sigReq.providerEnvelopeId);

  return NextResponse.redirect(new URL(viewUrl, _req.url));
}
