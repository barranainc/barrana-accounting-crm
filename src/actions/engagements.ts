"use server";

import { db } from "@/lib/db";
import { assertStaff, assertAdmin } from "@/lib/permissions";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const engagementSchema = z.object({
  clientId: z.string().min(1),
  serviceType: z.enum([
    "BOOKKEEPING", "TAX_RETURN", "PAYROLL", "CORPORATE_TAX",
    "HST_GST_FILING", "FINANCIAL_REPORTING", "CFO_ADVISORY", "VENTURE_ADVISORY",
  ]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  reportingPeriodStart: z.coerce.date().optional().nullable(),
  reportingPeriodEnd: z.coerce.date().optional().nullable(),
  taxYear: z.coerce.number().int().optional().nullable(),
  assignedOwnerId: z.string().min(1, "Owner is required"),
  assignedAssistantId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "WAITING_ON_CLIENT", "IN_REVIEW", "COMPLETED", "ON_HOLD", "ARCHIVED"]).default("DRAFT"),
  notes: z.string().optional(),
});

export async function createEngagement(formData: z.infer<typeof engagementSchema>) {
  const session = await assertStaff();
  const data = engagementSchema.parse(formData);

  const engagement = await db.engagement.create({ data });

  await createAuditEvent({
    action: AuditAction.ENGAGEMENT_CREATED,
    actorUserId: session.user.id,
    clientId: engagement.clientId,
    engagementId: engagement.id,
    entityType: "Engagement",
    entityId: engagement.id,
    metadata: { title: engagement.title, serviceType: engagement.serviceType },
  });

  revalidatePath(`/clients/${engagement.clientId}`);
  revalidatePath("/clients");
  return { id: engagement.id };
}

export async function updateEngagement(
  engagementId: string,
  formData: Partial<z.infer<typeof engagementSchema>>,
  prevStatus?: string
) {
  const session = await assertStaff();
  const engagement = await db.engagement.update({
    where: { id: engagementId },
    data: formData,
  });

  const action = formData.status && formData.status !== prevStatus
    ? AuditAction.ENGAGEMENT_UPDATED
    : AuditAction.ENGAGEMENT_UPDATED;

  await createAuditEvent({
    action,
    actorUserId: session.user.id,
    clientId: engagement.clientId,
    engagementId: engagement.id,
    entityType: "Engagement",
    entityId: engagement.id,
    metadata: { updated: Object.keys(formData), status: engagement.status },
  });

  revalidatePath(`/engagements/${engagementId}`);
  revalidatePath(`/clients/${engagement.clientId}`);
  return engagement;
}

export async function archiveEngagement(engagementId: string) {
  const session = await assertAdmin();
  const engagement = await db.engagement.update({
    where: { id: engagementId },
    data: { status: "ARCHIVED" },
  });

  await createAuditEvent({
    action: AuditAction.ENGAGEMENT_ARCHIVED,
    actorUserId: session.user.id,
    clientId: engagement.clientId,
    engagementId: engagement.id,
    entityType: "Engagement",
    entityId: engagement.id,
  });

  revalidatePath(`/clients/${engagement.clientId}`);
  return engagement;
}
