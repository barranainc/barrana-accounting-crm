import { db } from "@/lib/db";
import type { AuditAction } from "@/lib/audit-actions";

interface CreateAuditEventOpts {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  clientId?: string;
  engagementId?: string;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget — never let audit failure crash a user-facing action.
export async function createAuditEvent(opts: CreateAuditEventOpts): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        actorUserId: opts.actorUserId ?? null,
        clientId: opts.clientId ?? null,
        engagementId: opts.engagementId ?? null,
        metadata: (opts.metadata ?? {}) as object,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit event:", err);
  }
}
