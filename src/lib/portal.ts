import { db } from "@/lib/db";
import type { Client } from "@prisma/client";

export interface PortalScope {
  clientId: string;
  client: Client;
}

// Shared helper for all portal (CLIENT_USER) pages.
// Returns the client linked to this user, or null if not yet linked.
export async function getPortalScope(userId: string): Promise<PortalScope | null> {
  const link = await db.clientUserLink.findFirst({
    where: { userId },
    include: { client: true },
  });
  if (!link) return null;
  return { clientId: link.clientId, client: link.client };
}
