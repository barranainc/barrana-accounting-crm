"use server";

import { db } from "@/lib/db";
import { assertStaff, assertAuth, assertClientAccess, isStaff } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { email } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const noticeSchema = z.object({
  clientId: z.string().min(1),
  engagementId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  noticeType: z.enum([
    "NOTICE_OF_ASSESSMENT", "CRA_LETTER", "ENGAGEMENT_LETTER",
    "REPORT", "MEMO", "INVOICE", "GENERAL",
  ]),
  documentId: z.string().min(1, "Document is required"),
});

export async function createNotice(formData: z.infer<typeof noticeSchema>) {
  const session = await assertStaff();
  const data = noticeSchema.parse(formData);

  const notice = await db.noticeLetter.create({
    data: { ...data, publishedById: session.user.id, status: "DRAFT" },
  });

  await createAuditEvent({
    action: AuditAction.NOTICE_CREATED,
    actorUserId: session.user.id,
    clientId: data.clientId,
    engagementId: data.engagementId ?? undefined,
    entityType: "NoticeLetter",
    entityId: notice.id,
    metadata: { title: data.title, noticeType: data.noticeType },
  });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/notices");
  return { id: notice.id };
}

export async function publishNotice(noticeId: string) {
  const session = await assertStaff();

  const notice = await db.noticeLetter.findUniqueOrThrow({
    where: { id: noticeId },
    include: { document: { select: { visibility: true } } },
  });

  // Enforce: document must be CLIENT_VISIBLE before notice can be published
  if (notice.document.visibility !== "CLIENT_VISIBLE") {
    throw new Error(
      "Cannot publish notice: the linked document is marked as internal. Change the document visibility to Client Visible first."
    );
  }

  const published = await db.noticeLetter.update({
    where: { id: noticeId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  await createAuditEvent({
    action: AuditAction.NOTICE_PUBLISHED,
    actorUserId: session.user.id,
    clientId: published.clientId,
    entityType: "NoticeLetter",
    entityId: noticeId,
    metadata: { title: published.title },
  });

  // Notify client users
  const links = await db.clientUserLink.findMany({ where: { clientId: published.clientId } });
  for (const link of links) {
    await createNotification({
      userId: link.userId,
      title: "New notice from your accountant",
      body: published.title,
      link: `/portal/notices`,
    });
  }

  // Stub email notification
  const clientContacts = await db.clientContact.findMany({
    where: { clientId: published.clientId, portalAccess: true },
  });
  for (const contact of clientContacts) {
    await email.send({
      to: contact.email,
      subject: `New notice: ${published.title}`,
      body: `A new notice has been published to your portal: ${published.title}`,
    });
  }

  await db.noticeLetter.update({ where: { id: noticeId }, data: { emailNotifiedAt: new Date() } });

  revalidatePath(`/clients/${published.clientId}`);
  revalidatePath("/notices");
  return published;
}

export async function supersedNotice(oldNoticeId: string, newNoticeId: string) {
  const session = await assertStaff();

  const old = await db.noticeLetter.update({
    where: { id: oldNoticeId },
    data: { status: "SUPERSEDED" },
  });

  await db.noticeLetter.update({
    where: { id: newNoticeId },
    data: { supersededById: oldNoticeId },
  });

  await createAuditEvent({
    action: AuditAction.NOTICE_SUPERSEDED,
    actorUserId: session.user.id,
    clientId: old.clientId,
    entityType: "NoticeLetter",
    entityId: oldNoticeId,
    metadata: { supersededBy: newNoticeId },
  });

  revalidatePath(`/clients/${old.clientId}`);
  revalidatePath("/notices");
}

// Client marks notice as viewed
export async function markNoticeViewed(noticeId: string) {
  const session = await assertAuth();

  const notice = await db.noticeLetter.findUniqueOrThrow({ where: { id: noticeId } });
  await assertClientAccess(notice.clientId);

  if (!notice.clientViewedAt) {
    await db.noticeLetter.update({
      where: { id: noticeId },
      data: { clientViewedAt: new Date(), status: "VIEWED" },
    });

    await createAuditEvent({
      action: AuditAction.NOTICE_VIEWED,
      actorUserId: session.user.id,
      clientId: notice.clientId,
      entityType: "NoticeLetter",
      entityId: noticeId,
    });
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getNotices(clientId: string) {
  const session = await assertAuth();
  const userIsStaff = isStaff(session.user.role);

  if (!userIsStaff) await assertClientAccess(clientId);

  return db.noticeLetter.findMany({
    where: {
      clientId,
      // Client users only see published/viewed notices
      ...(userIsStaff ? {} : { status: { in: ["PUBLISHED", "VIEWED"] } }),
    },
    include: {
      document: { select: { id: true, fileName: true, mimeType: true, fileSize: true } },
      publishedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
