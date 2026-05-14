import { requireStaff } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { ClientForm } from "@/components/clients/ClientForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "New Client" };

export default async function NewClientPage() {
  await requireStaff();

  return (
    <div>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to clients
      </Link>
      <PageHeader title="New client" description="Add a new client to Barrana Accounting." />
      <ClientForm mode="create" />
    </div>
  );
}
