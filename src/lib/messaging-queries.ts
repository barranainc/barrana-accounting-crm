import { db } from "@/lib/db";
import type { ThreadType } from "@prisma/client";

// Thread-level scope — threadType lives on MessageThread
function threadScopeWhere(clientId: string, isClientUser: boolean) {
  return {
    clientId,
    ...(isClientUser ? { threadType: "CLIENT_STAFF" as ThreadType } : {}),
  };
}

// Message-level scope — isInternal lives on Message, not MessageThread
function messageScopeWhere(isClientUser: boolean) {
  return isClientUser ? { isInternal: false } : {};
}

export async function queryThreads(clientId: string, isClientUser: boolean) {
  return db.messageThread.findMany({
    where: threadScopeWhere(clientId, isClientUser),
    include: {
      messages: {
        where: messageScopeWhere(isClientUser),
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { id: true, name: true } } },
      },
      engagement: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function queryThreadMessages(
  threadId: string,
  clientId: string,
  isClientUser: boolean
) {
  // Verify thread scope first — blocks client from accessing INTERNAL threads
  const thread = await db.messageThread.findFirst({
    where: { id: threadId, ...threadScopeWhere(clientId, isClientUser) },
  });
  if (!thread) throw new Error("Thread not found or access denied");

  const messages = await db.message.findMany({
    where: {
      threadId,
      ...messageScopeWhere(isClientUser),
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
      attachments: {
        include: {
          document: { select: { id: true, title: true, fileName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return { thread, messages };
}
