import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvitePortalUserDialog } from "@/components/clients/InvitePortalUserDialog";
import { formatDate } from "@/lib/utils";
import { Users, KeyRound } from "lucide-react";

interface ClientContactsTabProps {
  clientId: string;
}

export async function ClientContactsTab({ clientId }: ClientContactsTabProps) {
  const [client, contacts, portalLinks] = await Promise.all([
    db.client.findUnique({
      where: { id: clientId },
      select: { businessName: true, primaryEmail: true },
    }),
    db.clientContact.findMany({ where: { clientId }, orderBy: { createdAt: "asc" } }),
    db.clientUserLink.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, user: { select: { id: true, name: true, email: true, status: true } } },
    }),
  ]);

  // A contact "has portal access" only if a real login exists for their email —
  // the ClientContact.portalAccess flag alone never created one.
  const portalEmails = new Set(portalLinks.map((l) => l.user.email.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* ── Portal access ──────────────────────────────────────────────────── */}
      <SectionCard
        title="Portal access"
        description="Logins that let this client sign in and see their documents, requests, messages and signatures."
        action={
          <InvitePortalUserDialog
            clientId={clientId}
            defaultName={client?.businessName ?? ""}
            defaultEmail={client?.primaryEmail ?? ""}
          />
        }
      >
        {portalLinks.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No portal login yet"
            description="This client can't sign in. Use “Invite to portal” to create their login."
          />
        ) : (
          <div className="divide-y divide-brand-greyBorder">
            {portalLinks.map(({ user, createdAt }) => (
              <div key={user.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-greyLight text-muted-foreground"
                    }`}
                  >
                    {user.status.toLowerCase()}
                  </span>
                  <p className="mt-1 text-[11px] text-muted-foreground">Since {formatDate(createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Contacts ───────────────────────────────────────────────────────── */}
      <SectionCard title="Contacts" description="People associated with this client">
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add contacts to track people associated with this client."
          />
        ) : (
          <div className="divide-y divide-brand-greyBorder">
            {contacts.map((contact) => {
              const hasLogin = portalEmails.has(contact.email.toLowerCase());
              return (
                <div key={contact.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{contact.name}</span>
                        {contact.title && (
                          <span className="text-xs text-muted-foreground">{contact.title}</span>
                        )}
                        {contact.relationshipType && (
                          <span className="rounded-full bg-brand-greyLight px-2 py-0.5 text-xs text-muted-foreground capitalize">
                            {contact.relationshipType.replace(/_/g, " ").toLowerCase()}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="hover:text-brand-navy hover:underline">
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="hover:text-brand-navy hover:underline">
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        hasLogin ? "bg-green-100 text-green-700" : "bg-brand-greyLight text-muted-foreground"
                      }`}
                      title={hasLogin ? "This contact can sign in to the portal" : "No portal login for this email"}
                    >
                      {hasLogin ? "Portal access" : "No portal login"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
