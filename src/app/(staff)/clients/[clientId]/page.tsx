import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit2, Building2 } from "lucide-react";
import { ClientOverviewTab } from "@/components/clients/tabs/ClientOverviewTab";
import { ClientContactsTab } from "@/components/clients/tabs/ClientContactsTab";
import { ClientEngagementsTab } from "@/components/clients/tabs/ClientEngagementsTab";
import { ClientDocumentsTab } from "@/components/clients/tabs/ClientDocumentsTab";
import { ClientRequestsTab } from "@/components/clients/tabs/ClientRequestsTab";
import { ClientMessagesTab } from "@/components/clients/tabs/ClientMessagesTab";
import { ClientNoticesTab } from "@/components/clients/tabs/ClientNoticesTab";
import { ClientTasksTab } from "@/components/clients/tabs/ClientTasksTab";
import { ClientAuditTab } from "@/components/clients/tabs/ClientAuditTab";

const TABS = [
  { key: "overview",     label: "Overview"     },
  { key: "contacts",     label: "Contacts"     },
  { key: "engagements",  label: "Engagements"  },
  { key: "documents",    label: "Documents"    },
  { key: "requests",     label: "Requests"     },
  { key: "messages",     label: "Messages"     },
  { key: "notices",      label: "Notices"      },
  { key: "tasks",        label: "Tasks"        },
  { key: "audit",        label: "Audit"        },
] as const;

type TabKey = typeof TABS[number]["key"];

export async function generateMetadata({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = await db.client.findUnique({ where: { id: clientId }, select: { businessName: true } });
  return { title: client?.businessName ?? "Client" };
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireStaff();
  const { clientId } = await params;
  const { tab: tabParam } = await searchParams;

  const activeTab: TabKey = (TABS.find((t) => t.key === tabParam)?.key ?? "overview") as TabKey;

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      _count: {
        select: {
          engagements: true,
          documentRequests: true,
          documents: true,
          tasks: true,
          notices: true,
        },
      },
    },
  });

  if (!client) notFound();

  return (
    <div>
      {/* Client header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy/10 shrink-0">
              <Building2 className="h-5 w-5 text-brand-navy" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{client.businessName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={client.status} />
                <span className="text-xs text-muted-foreground capitalize">
                  {client.clientType.replace(/_/g, " ").toLowerCase()}
                </span>
                {(client.flags as string[]).map((flag) => (
                  <span key={flag} className="rounded-full bg-brand-plum/10 px-2 py-0.5 text-xs text-brand-plum capitalize">
                    {flag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/clients/${clientId}/edit`}><Edit2 className="h-3.5 w-3.5" />Edit</Link>
          </Button>
        </div>

        {/* Quick stats */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{client._count.engagements} engagement{client._count.engagements !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{client._count.documentRequests} request{client._count.documentRequests !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{client._count.documents} document{client._count.documents !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{client._count.tasks} task{client._count.tasks !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 border-b border-brand-greyBorder">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/clients/${clientId}?tab=${key}`}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-brand-greyBorder"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "overview"    && <ClientOverviewTab client={client} />}
      {activeTab === "contacts"    && <ClientContactsTab clientId={clientId} />}
      {activeTab === "engagements" && <ClientEngagementsTab clientId={clientId} />}
      {activeTab === "documents"   && <ClientDocumentsTab clientId={clientId} />}
      {activeTab === "requests"    && <ClientRequestsTab clientId={clientId} clientType={client.clientType} />}
      {activeTab === "messages"    && <ClientMessagesTab clientId={clientId} />}
      {activeTab === "notices"     && <ClientNoticesTab clientId={clientId} />}
      {activeTab === "tasks"       && <ClientTasksTab clientId={clientId} />}
      {activeTab === "audit"       && <ClientAuditTab clientId={clientId} />}
    </div>
  );
}
