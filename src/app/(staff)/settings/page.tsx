import { requireSuperAdmin } from "@/lib/permissions"; // SUPER_ADMIN only
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSuperAdmin(); // blocks CPA_ADMIN and below at page level

  const userCount = await db.user.count({ where: { status: "ACTIVE" } });
  const clientCount = await db.client.count({ where: { status: { not: "ARCHIVED" } } });

  return (
    <div>
      <PageHeader title="Settings" description="System configuration — Super Admin only." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-2xl">
        <SectionCard title="System overview">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Active users</dt>
              <dd className="font-medium">{userCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Active clients</dt>
              <dd className="font-medium">{clientCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Storage provider</dt>
              <dd className="font-medium capitalize">{process.env.STORAGE_PROVIDER ?? "local"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email provider</dt>
              <dd className="font-medium capitalize">{process.env.EMAIL_PROVIDER ?? "log"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Signature provider</dt>
              <dd className="font-medium capitalize">{process.env.SIGNATURE_PROVIDER ?? "mock"}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Phase 2 integrations">
          <p className="text-sm text-muted-foreground">
            The following integrations are planned for Phase 2 and will be configured here:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              QuickBooks Online sync
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              DocuSign / Dropbox Sign provider
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              Email delivery (Resend / SendGrid)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              S3 / Supabase Storage
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
              OCR extraction pipeline
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
