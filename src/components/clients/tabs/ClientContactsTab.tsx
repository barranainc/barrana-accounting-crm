import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

interface ClientContactsTabProps {
  clientId: string;
}

export async function ClientContactsTab({ clientId }: ClientContactsTabProps) {
  const contacts = await db.clientContact.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <SectionCard title="Contacts" description="People associated with this client">
      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add contacts to track people associated with this client."
        />
      ) : (
        <div className="divide-y divide-brand-greyBorder">
          {contacts.map((contact) => (
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
                    contact.portalAccess
                      ? "bg-green-100 text-green-700"
                      : "bg-brand-greyLight text-muted-foreground"
                  }`}
                >
                  {contact.portalAccess ? "Portal access" : "No portal access"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
