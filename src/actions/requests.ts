"use server";

import { db } from "@/lib/db";
import { assertStaff, assertClientAccess } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DocumentRequestStatus } from "@prisma/client";

const requestSchema = z.object({
  clientId: z.string().min(1),
  engagementId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export async function createDocumentRequest(formData: z.infer<typeof requestSchema>) {
  const session = await assertStaff();
  const data = requestSchema.parse(formData);

  const request = await db.documentRequest.create({
    data: { ...data, requestedById: session.user.id },
  });

  await createAuditEvent({
    action: AuditAction.DOCUMENT_REQUEST_CREATED,
    actorUserId: session.user.id,
    clientId: request.clientId,
    engagementId: request.engagementId ?? undefined,
    entityType: "DocumentRequest",
    entityId: request.id,
    metadata: { title: request.title, category: request.category },
  });

  // Notify client users linked to this client
  const links = await db.clientUserLink.findMany({ where: { clientId: request.clientId } });
  for (const link of links) {
    await createNotification({
      userId: link.userId,
      title: "New document requested",
      body: `We've requested: ${request.title}`,
      link: `/portal/requests`,
    });
  }

  revalidatePath(`/clients/${request.clientId}`);
  revalidatePath("/documents/requests");
  return { id: request.id };
}

export async function createBulkDocumentRequests(
  items: z.infer<typeof requestSchema>[],
  templateName: string
) {
  const session = await assertStaff();
  const requests = await db.$transaction(
    items.map((item) =>
      db.documentRequest.create({
        data: { ...requestSchema.parse(item), requestedById: session.user.id },
      })
    )
  );

  if (requests.length > 0) {
    const clientId = requests[0].clientId;
    await createAuditEvent({
      action: AuditAction.DOCUMENT_REQUESTS_BULK_CREATED,
      actorUserId: session.user.id,
      clientId,
      entityType: "DocumentRequest",
      entityId: requests[0].id,
      metadata: { count: requests.length, template: templateName },
    });

    // One consolidated notification to the client's portal users.
    const count = requests.length;
    const plural = count !== 1 ? "s" : "";
    const links = await db.clientUserLink.findMany({ where: { clientId } });
    for (const link of links) {
      await createNotification({
        userId: link.userId,
        title: `${count} document${plural} requested`,
        body: `We've requested ${count} document${plural}. Please review and upload.`,
        link: `/portal/requests`,
      });
    }

    revalidatePath(`/clients/${clientId}`);
  }

  revalidatePath("/documents/requests");
  return requests.map((r) => r.id);
}

export async function updateDocumentRequestStatus(
  requestId: string,
  status: DocumentRequestStatus
) {
  const session = await assertStaff();

  const prev = await db.documentRequest.findUniqueOrThrow({ where: { id: requestId } });
  const request = await db.documentRequest.update({
    where: { id: requestId },
    data: { status },
  });

  await createAuditEvent({
    action: AuditAction.DOCUMENT_REQUEST_STATUS_CHANGED,
    actorUserId: session.user.id,
    clientId: request.clientId,
    engagementId: request.engagementId ?? undefined,
    entityType: "DocumentRequest",
    entityId: request.id,
    metadata: { from: prev.status, to: status },
  });

  if (status === "REJECTED" || status === "NEEDS_REPLACEMENT") {
    const links = await db.clientUserLink.findMany({ where: { clientId: request.clientId } });
    for (const link of links) {
      await createNotification({
        userId: link.userId,
        title: status === "REJECTED" ? "Document rejected" : "Replacement needed",
        body: `Please review: ${request.title}`,
        link: `/portal/requests`,
      });
    }
  }

  revalidatePath(`/clients/${request.clientId}`);
  revalidatePath("/documents/requests");
  return request;
}

export async function archiveDocumentRequest(requestId: string) {
  const session = await assertStaff();
  const prev = await db.documentRequest.findUniqueOrThrow({ where: { id: requestId } });
  const request = await db.documentRequest.update({
    where: { id: requestId },
    data: { status: "ARCHIVED" },
  });
  await createAuditEvent({
    action: AuditAction.DOCUMENT_REQUEST_ARCHIVED,
    actorUserId: session.user.id,
    clientId: request.clientId,
    entityType: "DocumentRequest",
    entityId: requestId,
    metadata: { from: prev.status },
  });
  revalidatePath(`/clients/${request.clientId}`);
  return request;
}

// Client querying their own requests — filtered at query level
export async function getClientRequests(clientId: string) {
  const session = await assertClientAccess(clientId);
  const isClient = session.user.role === "CLIENT_USER";

  return db.documentRequest.findMany({
    where: {
      clientId,
      status: { not: "ARCHIVED" },
    },
    include: {
      engagement: { select: { id: true, title: true, serviceType: true } },
      documents: {
        where: isClient ? { isCurrentVersion: true, visibility: "CLIENT_VISIBLE" } : { isCurrentVersion: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
