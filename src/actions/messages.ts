"use server";

import { db } from "@/lib/db";
import { assertAuth, assertStaff, assertClientAccess, isStaff } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Thread creation ──────────────────────────────────────────────────────────

const threadSchema = z.object({
  clientId: z.string().min(1),
  engagementId: z.string().optional().nullable(),
  subject: z.string().optional(),
  threadType: z.enum(["CLIENT_STAFF", "INTERNAL"]).default("CLIENT_STAFF"),
});

export async function createThread(formData: z.infer<typeof threadSchema>) {
  const session = await assertAuth();
  const data = threadSchema.parse(formData);

  // Client users can only create CLIENT_STAFF threads, never INTERNAL
  if (session.user.role === "CLIENT_USER") {
    data.threadType = "CLIENT_STAFF";
    await assertClientAccess(data.clientId);
  } else {
    await assertStaff();
  }

  const thread = await db.messageThread.create({ data });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/messages");
  return { id: thread.id };
}

// ─── Send message ─────────────────────────────────────────────────────────────

const messageSchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1, "Message cannot be empty"),
  isInternal: z.boolean().default(false),
});

export async function sendMessage(formData: z.infer<typeof messageSchema>) {
  const session = await assertAuth();
  const data = messageSchema.parse(formData);

  const thread = await db.messageThread.findUniqueOrThrow({
    where: { id: data.threadId },
    select: { clientId: true, threadType: true },
  });

  const userIsStaff = isStaff(session.user.role);

  // Client users cannot send to INTERNAL threads
  if (!userIsStaff && thread.threadType === "INTERNAL") {
    throw new Error("Unauthorised");
  }

  // Client users can only send to their own client's threads
  if (!userIsStaff) {
    await assertClientAccess(thread.clientId);
    // Client messages are never internal
    data.isInternal = false;
  }

  const message = await db.message.create({
    data: { ...data, authorId: session.user.id },
  });

  // Update thread status
  const newStatus = userIsStaff ? "WAITING_ON_CLIENT" : "WAITING_ON_STAFF";
  await db.messageThread.update({
    where: { id: data.threadId },
    data: { status: newStatus, updatedAt: new Date() },
  });

  const auditAction = data.isInternal ? AuditAction.INTERNAL_NOTE_ADDED : AuditAction.MESSAGE_SENT;
  await createAuditEvent({
    action: auditAction,
    actorUserId: session.user.id,
    clientId: thread.clientId,
    entityType: "Message",
    entityId: message.id,
    metadata: { threadId: data.threadId, isInternal: data.isInternal },
  });

  // Notify recipients
  if (!data.isInternal) {
    if (userIsStaff) {
      // Notify client users
      const links = await db.clientUserLink.findMany({ where: { clientId: thread.clientId } });
      for (const link of links) {
        await createNotification({
          userId: link.userId,
          title: "New message from your accountant",
          body: data.body.slice(0, 100),
          link: `/portal/messages`,
        });
      }
    } else {
      // Notify staff
      const staffUsers = await db.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "CPA_ADMIN", "ASSISTANT"] }, status: "ACTIVE" },
        select: { id: true },
      });
      for (const u of staffUsers) {
        await createNotification({
          userId: u.id,
          title: "Client sent a message",
          body: data.body.slice(0, 100),
          link: `/messages`,
        });
      }
    }
  }

  revalidatePath("/messages");
  revalidatePath(`/clients/${thread.clientId}`);
  return { id: message.id };
}

// ─── Queries — enforce thread type at query level ─────────────────────────────

export async function getThreads(clientId: string) {
  const session = await assertAuth();
  const userIsStaff = isStaff(session.user.role);

  if (!userIsStaff) await assertClientAccess(clientId);

  return db.messageThread.findMany({
    where: {
      clientId,
      // Client users only see CLIENT_STAFF threads — filtered at query level, not UI
      ...(userIsStaff ? {} : { threadType: "CLIENT_STAFF" }),
    },
    include: {
      messages: {
        where: userIsStaff ? {} : { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getThreadMessages(threadId: string) {
  const session = await assertAuth();
  const userIsStaff = isStaff(session.user.role);

  const thread = await db.messageThread.findUniqueOrThrow({
    where: { id: threadId },
    select: { clientId: true, threadType: true },
  });

  if (!userIsStaff) {
    // Block client from internal threads at query level
    if (thread.threadType === "INTERNAL") throw new Error("Unauthorised");
    await assertClientAccess(thread.clientId);
  }

  return db.message.findMany({
    where: {
      threadId,
      // Client users never receive internal messages — filtered at query level
      ...(userIsStaff ? {} : { isInternal: false }),
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
      attachments: { include: { document: { select: { id: true, title: true, fileName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
}
