"use server";

import { db } from "@/lib/db";
import { assertStaff, assertAuth, assertClientAccess, isStaff } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TaskStatus } from "@prisma/client";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  clientId: z.string().optional().nullable(),
  engagementId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  clientVisible: z.boolean().default(false),
});

export async function createTask(formData: z.infer<typeof taskSchema>) {
  const session = await assertStaff();
  const data = taskSchema.parse(formData);

  const task = await db.task.create({
    data: { ...data, createdById: session.user.id, status: "TO_DO" },
  });

  await createAuditEvent({
    action: AuditAction.TASK_CREATED,
    actorUserId: session.user.id,
    clientId: task.clientId ?? undefined,
    engagementId: task.engagementId ?? undefined,
    entityType: "Task",
    entityId: task.id,
    metadata: { title: task.title, assignedToId: task.assignedToId },
  });

  // Notify assignee
  if (task.assignedToId) {
    await createNotification({
      userId: task.assignedToId,
      title: "Task assigned to you",
      body: task.title,
      link: `/tasks`,
    });
  }

  revalidatePath("/tasks");
  if (task.clientId) revalidatePath(`/clients/${task.clientId}`);
  return { id: task.id };
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const session = await assertAuth();
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });

  // Client users cannot change task status
  if (session.user.role === "CLIENT_USER") throw new Error("Unauthorised");

  const completedAt = status === "DONE" ? new Date() : null;

  const updated = await db.task.update({
    where: { id: taskId },
    data: { status, completedAt },
  });

  await createAuditEvent({
    action: AuditAction.TASK_STATUS_CHANGED,
    actorUserId: session.user.id,
    clientId: task.clientId ?? undefined,
    entityType: "Task",
    entityId: taskId,
    metadata: { from: task.status, to: status },
  });

  revalidatePath("/tasks");
  if (task.clientId) revalidatePath(`/clients/${task.clientId}`);
  return updated;
}

export async function updateTask(taskId: string, formData: Partial<z.infer<typeof taskSchema>>) {
  const session = await assertStaff();
  const task = await db.task.update({
    where: { id: taskId },
    data: formData,
  });

  await createAuditEvent({
    action: AuditAction.TASK_UPDATED,
    actorUserId: session.user.id,
    clientId: task.clientId ?? undefined,
    entityType: "Task",
    entityId: taskId,
    metadata: { updated: Object.keys(formData) },
  });

  revalidatePath("/tasks");
  return task;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getTasksForClient(clientId: string) {
  const session = await assertAuth();
  const userIsStaff = isStaff(session.user.role);

  if (!userIsStaff) await assertClientAccess(clientId);

  return db.task.findMany({
    where: {
      clientId,
      // Client users only see client-visible tasks — filtered at query level
      ...(userIsStaff ? {} : { clientVisible: true }),
      status: { not: "CANCELLED" },
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function logReminder(opts: {
  taskId?: string;
  documentRequestId?: string;
  note?: string;
  channel?: "IN_APP" | "EMAIL" | "MANUAL";
}) {
  const session = await assertStaff();

  const log = await db.reminderLog.create({
    data: {
      taskId: opts.taskId ?? null,
      documentRequestId: opts.documentRequestId ?? null,
      sentById: session.user.id,
      channel: opts.channel ?? "IN_APP",
      note: opts.note,
    },
  });

  await createAuditEvent({
    action: AuditAction.REMINDER_LOGGED,
    actorUserId: session.user.id,
    entityType: "ReminderLog",
    entityId: log.id,
    metadata: { taskId: opts.taskId, documentRequestId: opts.documentRequestId, channel: opts.channel },
  });

  return log;
}
