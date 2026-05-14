"use server";

import { db } from "@/lib/db";
import { assertStaff, assertAuth, assertClientAccess } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { signatureProvider } from "@/lib/signatures";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const sigRequestSchema = z.object({
  clientId: z.string().min(1),
  engagementId: z.string().optional().nullable(),
  documentId: z.string().min(1, "Document is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export async function createSignatureRequest(formData: z.infer<typeof sigRequestSchema>) {
  const session = await assertStaff();
  const data = sigRequestSchema.parse(formData);

  // Document must exist and be linked to the client
  const document = await db.document.findUniqueOrThrow({ where: { id: data.documentId } });
  if (document.clientId !== data.clientId) throw new Error("Document does not belong to this client");
  if (document.visibility !== "CLIENT_VISIBLE") {
    throw new Error("Signature requests can only be created for client-visible documents");
  }

  const sigReq = await db.signatureRequest.create({
    data: {
      ...data,
      requestedById: session.user.id,
      provider: process.env.SIGNATURE_PROVIDER ?? "mock",
      status: "DRAFT",
    },
  });

  await createAuditEvent({
    action: AuditAction.SIGNATURE_REQUEST_CREATED,
    actorUserId: session.user.id,
    clientId: data.clientId,
    engagementId: data.engagementId ?? undefined,
    entityType: "SignatureRequest",
    entityId: sigReq.id,
    metadata: { title: data.title, documentId: data.documentId },
  });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/signatures");
  return { id: sigReq.id };
}

export async function sendSignatureRequest(sigRequestId: string) {
  const session = await assertStaff();

  const sigReq = await db.signatureRequest.findUniqueOrThrow({
    where: { id: sigRequestId },
    include: {
      document: { select: { storagePath: true, visibility: true } },
      client: { select: { primaryEmail: true, businessName: true } },
    },
  });

  if (sigReq.document.visibility !== "CLIENT_VISIBLE") {
    throw new Error("Cannot send signature request: document is not client-visible");
  }

  // Get primary signer email from client
  const signerContact = await db.clientContact.findFirst({
    where: { clientId: sigReq.clientId },
    orderBy: { createdAt: "asc" },
  });

  const signerEmail = signerContact?.email ?? sigReq.client.primaryEmail;
  const signerName = signerContact?.name ?? sigReq.client.businessName;

  const envelope = await signatureProvider.createEnvelope({
    title: sigReq.title,
    signerEmail,
    signerName,
    documentPath: sigReq.document.storagePath,
    expiresAt: sigReq.expiresAt ?? undefined,
  });

  const updated = await db.signatureRequest.update({
    where: { id: sigRequestId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerEnvelopeId: envelope.envelopeId,
    },
  });

  await createAuditEvent({
    action: AuditAction.SIGNATURE_REQUEST_SENT,
    actorUserId: session.user.id,
    clientId: sigReq.clientId,
    entityType: "SignatureRequest",
    entityId: sigRequestId,
    metadata: { provider: sigReq.provider, envelopeId: envelope.envelopeId },
  });

  const links = await db.clientUserLink.findMany({ where: { clientId: sigReq.clientId } });
  for (const link of links) {
    await createNotification({
      userId: link.userId,
      title: "Signature requested",
      body: sigReq.title,
      link: `/portal/signatures`,
    });
  }

  revalidatePath(`/clients/${sigReq.clientId}`);
  revalidatePath("/signatures");
  return { id: updated.id };
}

export async function markSignatureViewed(sigRequestId: string) {
  const session = await assertAuth();
  const sigReq = await db.signatureRequest.findUniqueOrThrow({ where: { id: sigRequestId } });
  await assertClientAccess(sigReq.clientId);

  if (sigReq.status !== "SENT") return sigReq;

  const updated = await db.signatureRequest.update({
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

  return updated;
}

export async function completeSignature(sigRequestId: string) {
  const session = await assertAuth();
  const sigReq = await db.signatureRequest.findUniqueOrThrow({ where: { id: sigRequestId } });
  await assertClientAccess(sigReq.clientId);

  if (!["SENT", "VIEWED"].includes(sigReq.status)) {
    throw new Error("This signature request cannot be signed in its current state");
  }

  const updated = await db.signatureRequest.update({
    where: { id: sigRequestId },
    data: { status: "SIGNED", signedAt: new Date() },
  });

  await createAuditEvent({
    action: AuditAction.SIGNATURE_REQUEST_SIGNED,
    actorUserId: session.user.id,
    clientId: sigReq.clientId,
    entityType: "SignatureRequest",
    entityId: sigRequestId,
    metadata: { provider: sigReq.provider },
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
      body: sigReq.title,
      link: `/signatures`,
    });
  }

  revalidatePath("/signatures");
  revalidatePath(`/clients/${sigReq.clientId}`);
  return updated;
}

export async function cancelSignatureRequest(sigRequestId: string) {
  const session = await assertStaff();
  const sigReq = await db.signatureRequest.findUniqueOrThrow({ where: { id: sigRequestId } });

  const updated = await db.signatureRequest.update({
    where: { id: sigRequestId },
    data: { status: "CANCELLED" },
  });

  if (sigReq.providerEnvelopeId) {
    await signatureProvider.cancel(sigReq.providerEnvelopeId).catch(() => null);
  }

  await createAuditEvent({
    action: AuditAction.SIGNATURE_REQUEST_CANCELLED,
    actorUserId: session.user.id,
    clientId: sigReq.clientId,
    entityType: "SignatureRequest",
    entityId: sigRequestId,
  });

  revalidatePath("/signatures");
  return updated;
}
