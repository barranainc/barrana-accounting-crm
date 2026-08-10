import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { ClientForm } from "@/components/clients/ClientForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = await db.client.findUnique({ where: { id: clientId }, select: { businessName: true } });
  return { title: `Edit ${client?.businessName ?? "Client"}` };
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireStaff();
  const { clientId } = await params;

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) notFound();

  return (
    <div>
      <Link
        href={`/clients/${clientId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {client.businessName}
      </Link>
      <PageHeader title="Edit client" />
      {/* Server fetches data; ClientForm is the interactive client component */}
      <ClientForm
        mode="edit"
        clientId={clientId}
        defaultValues={{
          businessName:   client.businessName,
          legalName:      client.legalName ?? undefined,
          primaryEmail:   client.primaryEmail,
          primaryPhone:   client.primaryPhone ?? undefined,
          clientType:     client.clientType,
          status:         client.status,
          industry:       client.industry ?? undefined,
          businessNumber: client.businessNumber ?? undefined,
          hstNumber:      client.hstNumber ?? undefined,
          fiscalYearEnd:  client.fiscalYearEnd ?? undefined,
          addressLine1:   client.addressLine1 ?? undefined,
          addressLine2:   client.addressLine2 ?? undefined,
          city:           client.city ?? undefined,
          province:       client.province ?? undefined,
          postalCode:     client.postalCode ?? undefined,
          internalNotes:  client.internalNotes ?? undefined,
        }}
      />
    </div>
  );
}
