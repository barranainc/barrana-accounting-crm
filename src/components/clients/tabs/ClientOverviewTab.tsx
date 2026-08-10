import { SectionCard } from "@/components/shared/SectionCard";
import type { Client } from "@prisma/client";

interface ClientOverviewTabProps {
  client: Client;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 grid grid-cols-[140px_1fr] gap-3 items-start border-b border-brand-greyBorder last:border-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

export function ClientOverviewTab({ client }: ClientOverviewTabProps) {
  const typeLabel = client.clientType.replace(/_/g, " ").charAt(0) + client.clientType.replace(/_/g, " ").slice(1).toLowerCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Business profile */}
      <SectionCard title="Business Profile">
        <InfoRow label="Business name" value={client.businessName} />
        {client.legalName && <InfoRow label="Legal name" value={client.legalName} />}
        <InfoRow label="Client type" value={typeLabel} />
        <InfoRow label="Industry" value={client.industry} />
        <InfoRow label="Business number" value={client.businessNumber} />
        <InfoRow label="HST / GST number" value={client.hstNumber} />
        <InfoRow label="Fiscal year end" value={client.fiscalYearEnd} />
      </SectionCard>

      {/* Contact & address */}
      <SectionCard title="Contact Information">
        <InfoRow label="Primary email" value={
          client.primaryEmail
            ? <a href={`mailto:${client.primaryEmail}`} className="text-brand-navy hover:underline">{client.primaryEmail}</a>
            : null
        } />
        <InfoRow label="Primary phone" value={
          client.primaryPhone
            ? <a href={`tel:${client.primaryPhone}`} className="text-brand-navy hover:underline">{client.primaryPhone}</a>
            : null
        } />
        <InfoRow label="Address" value={
          [client.addressLine1, client.addressLine2, client.city, client.province, client.postalCode]
            .filter(Boolean)
            .join(", ") || null
        } />
        <InfoRow label="Country" value={client.country} />
      </SectionCard>

      {/* Internal notes */}
      {client.internalNotes && (
        <SectionCard title="Internal Notes" className="lg:col-span-2">
          <p className="text-sm text-foreground whitespace-pre-wrap">{client.internalNotes}</p>
        </SectionCard>
      )}

      {/* Client flags */}
      {(client.flags as string[]).length > 0 && (
        <SectionCard title="Client Flags" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(client.flags as string[]).map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-brand-plum/10 px-3 py-1 text-xs font-medium text-brand-plum capitalize"
              >
                {flag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
