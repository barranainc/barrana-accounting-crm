"use server";

import { db } from "@/lib/db";
import { assertStaff, assertAuth, assertClientAccess, assertAdmin } from "@/lib/permissions";
import { isStaff } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { storage } from "@/lib/storage";
import { generateStoragePath, ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DocumentReviewStatus, DocumentVisibility } from "@prisma/client";

// ─── Upload ───────────────────────────────────────────────────────────────────

interface UploadDocumentOpts {
  clientId: string;
  engagementId?: string | null;
  documentRequestId?: string | null;
  title: string;
  documentType: string;
  category: string;
  visibility: DocumentVisibility;
  reportingPeriodStart?: Date | null;
  reportingPeriodEnd?: Date | null;
  // The file buffer passed from a form action
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function uploadDocument(opts: UploadDocumentOpts) {
  const session = await assertAuth();
  const { role, id: userId } = session.user;
  const isStaffUser = isStaff(role);

  // Client users can only upload to their own client
  if (!isStaffUser) {
    await assertClientAccess(opts.clientId);
    // Clients always upload as CLIENT_VISIBLE
    opts.visibility = "CLIENT_VISIBLE";
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.includes(opts.mimeType)) {
    throw new Error(`File type not allowed: ${opts.mimeType}`);
  }
  if (opts.fileSize > MAX_FILE_BYTES) {
    throw new Error(`File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB ?? "25"} MB.`);
  }

  // Save the file first — if storage fails, no DB record is created. Persist the
  // path the provider hands back, not the one we suggested: OneDrive returns its
  // own item reference, and that is what later reads/deletes need.
  const storagePath = await storage.save({
    path: generateStoragePath(opts.clientId, opts.fileName),
    buffer: opts.fileBuffer,
    mimeType: opts.mimeType,
    fileName: opts.fileName,
  });

  // Self-rooting version chain: create v1, then update rootDocumentId = its own id
  const document = await db.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        clientId: opts.clientId,
        engagementId: opts.engagementId ?? null,
        documentRequestId: opts.documentRequestId ?? null,
        uploadedById: userId,
        title: opts.title,
        fileName: opts.fileName,
        mimeType: opts.mimeType,
        fileSize: opts.fileSize,
        storagePath,
        documentType: opts.documentType,
        category: opts.category,
        visibility: opts.visibility,
        reportingPeriodStart: opts.reportingPeriodStart ?? null,
        reportingPeriodEnd: opts.reportingPeriodEnd ?? null,
        versionNumber: 1,
        isCurrentVersion: true,
      },
    });
    // Self-root: all versions in chain share rootDocumentId = v1.id
    return tx.document.update({
      where: { id: created.id },
      data: { rootDocumentId: created.id },
    });
  });

  // Update linked request status to UPLOADED
  if (opts.documentRequestId) {
    await db.documentRequest.update({
      where: { id: opts.documentRequestId },
      data: { status: "UPLOADED" },
    });
    await createAuditEvent({
      action: AuditAction.DOCUMENT_REQUEST_STATUS_CHANGED,
      actorUserId: userId,
      clientId: opts.clientId,
      entityType: "DocumentRequest",
      entityId: opts.documentRequestId,
      metadata: { to: "UPLOADED" },
    });
  }

  const auditAction = isStaffUser ? AuditAction.DOCUMENT_UPLOADED_BY_STAFF : AuditAction.DOCUMENT_UPLOADED;
  await createAuditEvent({
    action: auditAction,
    actorUserId: userId,
    clientId: opts.clientId,
    engagementId: opts.engagementId ?? undefined,
    entityType: "Document",
    entityId: document.id,
    metadata: { fileName: opts.fileName, visibility: opts.visibility },
  });

  // If client uploads, notify staff
  if (!isStaffUser) {
    const staffUsers = await db.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "CPA_ADMIN", "ASSISTANT"] }, status: "ACTIVE" },
      select: { id: true },
    });
    for (const u of staffUsers) {
      await createNotification({
        userId: u.id,
        title: "Document uploaded by client",
        body: opts.title,
        link: `/documents/${document.id}`,
      });
    }
  }

  revalidatePath(`/clients/${opts.clientId}`);
  revalidatePath("/documents");
  return { id: document.id };
}

// ─── Version replacement ──────────────────────────────────────────────────────

export async function uploadDocumentVersion(opts: UploadDocumentOpts & { replacesDocumentId: string }) {
  const session = await assertAuth();
  const { id: userId } = session.user;

  const prev = await db.document.findUniqueOrThrow({ where: { id: opts.replacesDocumentId } });
  await assertClientAccess(prev.clientId);

  if (!ALLOWED_MIME_TYPES.includes(opts.mimeType)) throw new Error("File type not allowed");
  if (opts.fileSize > MAX_FILE_BYTES) throw new Error("File too large");

  // Persist the path the provider returns — see uploadDocument for why.
  const storagePath = await storage.save({
    path: generateStoragePath(opts.clientId, opts.fileName),
    buffer: opts.fileBuffer,
    mimeType: opts.mimeType,
    fileName: opts.fileName,
  });

  // prev.rootDocumentId is already the chain root (self-rooted on v1 creation)
  const rootId = prev.rootDocumentId ?? prev.id;

  const newDoc = await db.$transaction(async (tx) => {
    // Mark previous as no longer current
    await tx.document.update({ where: { id: prev.id }, data: { isCurrentVersion: false } });
    return tx.document.create({
      data: {
        clientId: opts.clientId,
        engagementId: opts.engagementId ?? null,
        documentRequestId: opts.documentRequestId ?? prev.documentRequestId,
        uploadedById: userId,
        title: opts.title,
        fileName: opts.fileName,
        mimeType: opts.mimeType,
        fileSize: opts.fileSize,
        storagePath,
        documentType: opts.documentType,
        category: opts.category,
        visibility: opts.visibility,
        versionNumber: prev.versionNumber + 1,
        isCurrentVersion: true,
        rootDocumentId: rootId,
        replacesDocumentId: prev.id,
      },
    });
  });

  // Reset linked request to UPLOADED for re-review
  if (newDoc.documentRequestId) {
    await db.documentRequest.update({
      where: { id: newDoc.documentRequestId },
      data: { status: "UPLOADED" },
    });
  }

  await createAuditEvent({
    action: AuditAction.DOCUMENT_VERSION_ADDED,
    actorUserId: userId,
    clientId: opts.clientId,
    entityType: "Document",
    entityId: newDoc.id,
    metadata: { versionNumber: newDoc.versionNumber, replacesDocumentId: prev.id },
  });

  revalidatePath(`/clients/${opts.clientId}`);
  revalidatePath("/documents");
  return { id: newDoc.id };
}

// ─── Review ───────────────────────────────────────────────────────────────────

export async function reviewDocument(
  documentId: string,
  reviewStatus: DocumentReviewStatus,
  note?: string
) {
  const session = await assertStaff();

  const document = await db.document.update({
    where: { id: documentId },
    data: { reviewStatus },
  });

  // Propagate to linked request if appropriate
  if (document.documentRequestId) {
    let requestStatus: "ACCEPTED" | "REJECTED" | "NEEDS_REPLACEMENT" | "UNDER_REVIEW" | undefined;
    if (reviewStatus === "ACCEPTED") requestStatus = "ACCEPTED";
    else if (reviewStatus === "REJECTED") requestStatus = "REJECTED";
    else if (reviewStatus === "NEEDS_REPLACEMENT") requestStatus = "NEEDS_REPLACEMENT";
    else if (reviewStatus === "UNDER_REVIEW") requestStatus = "UNDER_REVIEW";

    if (requestStatus) {
      await db.documentRequest.update({
        where: { id: document.documentRequestId },
        data: { status: requestStatus },
      });
      await createAuditEvent({
        action: AuditAction.DOCUMENT_REQUEST_STATUS_CHANGED,
        actorUserId: session.user.id,
        clientId: document.clientId,
        entityType: "DocumentRequest",
        entityId: document.documentRequestId,
        metadata: { to: requestStatus },
      });
    }
  }

  await createAuditEvent({
    action: AuditAction.DOCUMENT_REVIEWED,
    actorUserId: session.user.id,
    clientId: document.clientId,
    entityType: "Document",
    entityId: document.id,
    metadata: { reviewStatus, note },
  });

  // Notify client of rejection/replacement needed
  if (reviewStatus === "REJECTED" || reviewStatus === "NEEDS_REPLACEMENT") {
    const links = await db.clientUserLink.findMany({ where: { clientId: document.clientId } });
    for (const link of links) {
      await createNotification({
        userId: link.userId,
        title: reviewStatus === "REJECTED" ? "Document rejected" : "Document: replacement needed",
        body: note ?? document.title,
        link: `/portal/documents`,
      });
    }
  }

  revalidatePath(`/clients/${document.clientId}`);
  revalidatePath("/documents");
  return document;
}

// ─── Visibility ───────────────────────────────────────────────────────────────

export async function setDocumentVisibility(documentId: string, visibility: DocumentVisibility) {
  const session = await assertStaff();
  const document = await db.document.update({ where: { id: documentId }, data: { visibility } });
  await createAuditEvent({
    action: AuditAction.DOCUMENT_VISIBILITY_CHANGED,
    actorUserId: session.user.id,
    clientId: document.clientId,
    entityType: "Document",
    entityId: document.id,
    metadata: { visibility },
  });
  revalidatePath(`/clients/${document.clientId}`);
  return document;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

const commentSchema = z.object({
  documentId: z.string().min(1),
  body: z.string().min(1, "Comment cannot be empty"),
  isInternal: z.boolean().default(true),
});

export async function addDocumentComment(formData: z.infer<typeof commentSchema>) {
  const session = await assertAuth();
  const data = commentSchema.parse(formData);

  // Client users can only add client-visible comments
  if (session.user.role === "CLIENT_USER") {
    data.isInternal = false;
  }

  const document = await db.document.findUniqueOrThrow({
    where: { id: data.documentId },
    select: { clientId: true, title: true },
  });

  // Client must be linked
  if (session.user.role === "CLIENT_USER") {
    await assertClientAccess(document.clientId);
  }

  const comment = await db.documentComment.create({
    data: { ...data, authorId: session.user.id },
  });

  await createAuditEvent({
    action: data.isInternal ? AuditAction.INTERNAL_NOTE_ADDED : AuditAction.DOCUMENT_COMMENT_ADDED,
    actorUserId: session.user.id,
    clientId: document.clientId,
    entityType: "DocumentComment",
    entityId: comment.id,
    metadata: { documentId: data.documentId, isInternal: data.isInternal },
  });

  // Notify the other party. Internal staff notes notify nobody on the client side.
  const isClientAuthor = session.user.role === "CLIENT_USER";
  if (isClientAuthor) {
    const staffUsers = await db.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "CPA_ADMIN", "ASSISTANT"] }, status: "ACTIVE" },
      select: { id: true },
    });
    for (const u of staffUsers) {
      await createNotification({
        userId: u.id,
        title: "Client replied on a document",
        body: document.title,
        link: `/documents/${data.documentId}`,
      });
    }
  } else if (!data.isInternal) {
    const links = await db.clientUserLink.findMany({ where: { clientId: document.clientId } });
    for (const link of links) {
      await createNotification({
        userId: link.userId,
        title: "Question about your document",
        body: document.title,
        link: `/portal/documents/${data.documentId}`,
      });
    }
  }

  revalidatePath(`/documents/${data.documentId}`);
  revalidatePath(`/portal/documents/${data.documentId}`);
  return comment;
}

// Admins can delete any message on a document, at any time.
export async function deleteDocumentComment(commentId: string) {
  const session = await assertAdmin();

  const comment = await db.documentComment.findUniqueOrThrow({ where: { id: commentId } });
  const doc = await db.document.findUniqueOrThrow({
    where: { id: comment.documentId },
    select: { clientId: true },
  });

  await db.documentComment.delete({ where: { id: commentId } });

  await createAuditEvent({
    action: AuditAction.DOCUMENT_COMMENT_DELETED,
    actorUserId: session.user.id,
    clientId: doc.clientId,
    entityType: "DocumentComment",
    entityId: commentId,
    metadata: { documentId: comment.documentId, isInternal: comment.isInternal },
  });

  revalidatePath(`/documents/${comment.documentId}`);
  revalidatePath(`/portal/documents/${comment.documentId}`);
  return { id: commentId };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getDocumentComments(documentId: string) {
  const session = await assertAuth();
  const document = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    select: { clientId: true },
  });

  const isClientUser = session.user.role === "CLIENT_USER";
  if (isClientUser) await assertClientAccess(document.clientId);

  return db.documentComment.findMany({
    where: {
      documentId,
      // Client users never see internal comments — filtered at query level
      ...(isClientUser ? { isInternal: false } : {}),
    },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
}

// Marks a document's incoming messages read — flips the chat icon.
// Client reads incoming staff messages; staff read incoming client replies.
export async function markDocumentMessagesRead(documentId: string) {
  const session = await assertAuth();
  const isClient = session.user.role === "CLIENT_USER";

  const document = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    select: { clientId: true },
  });
  if (isClient) await assertClientAccess(document.clientId);

  const unread = await db.documentComment.findMany({
    where: isClient
      ? { documentId, isInternal: false, readByClientAt: null, author: { role: { not: "CLIENT_USER" } } }
      : { documentId, isInternal: false, readByStaffAt: null, author: { role: "CLIENT_USER" } },
    select: { id: true },
  });
  if (unread.length === 0) return { marked: 0 };

  await db.documentComment.updateMany({
    where: { id: { in: unread.map((c) => c.id) } },
    data: isClient ? { readByClientAt: new Date() } : { readByStaffAt: new Date() },
  });

  if (isClient) {
    revalidatePath("/portal/documents");
    revalidatePath(`/portal/documents/${documentId}`);
  } else {
    revalidatePath("/documents");
    revalidatePath(`/documents/${documentId}`);
    revalidatePath(`/clients/${document.clientId}`);
  }
  return { marked: unread.length };
}
