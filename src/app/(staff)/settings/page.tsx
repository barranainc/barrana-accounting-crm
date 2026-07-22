import { requireSuperAdmin } from "@/lib/permissions"; // SUPER_ADMIN only
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { db } from "@/lib/db";
import { getConnection, disconnect, ROOT_FOLDER } from "@/lib/onedrive/graph";
import { createAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/lib/audit-actions";
import { formatDateTime } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { Cloud, CheckCircle2, AlertTriangle, Link2, Unlink } from "lucide-react";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ onedrive?: string; message?: string; account?: string }>;
}) {
  const session = await requireSuperAdmin(); // blocks CPA_ADMIN and below at page level
  const { onedrive, message } = await searchParams;

  const [userCount, clientCount, connection] = await Promise.all([
    db.user.count({ where: { status: "ACTIVE" } }),
    db.client.count({ where: { status: { not: "ARCHIVED" } } }),
    getConnection(),
  ]);

  const configured = !!(process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET);
  const storageProvider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();

  async function doDisconnect() {
    "use server";
    await disconnect();
    await createAuditEvent({
      action: AuditAction.ONEDRIVE_DISCONNECTED,
      actorUserId: session.user.id,
      entityType: "OneDriveConnection",
      entityId: "singleton",
    });
    revalidatePath("/settings");
  }

  return (
    <div>
      <PageHeader title="Settings" description="System configuration — Super Admin only." />

      {/* OneDrive result banner */}
      {onedrive === "connected" && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>OneDrive connected. New client documents will be saved there.</p>
        </div>
      )}
      {onedrive === "error" && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t connect OneDrive</p>
            <p className="text-red-600/90">{message ?? "Please try again."}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
        {/* ── OneDrive ─────────────────────────────────────────────────── */}
        <SectionCard
          title="OneDrive"
          description={`Client documents are filed into "${ROOT_FOLDER}/<client name>".`}
        >
          {!configured ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>
                Not configured. Set <code className="rounded bg-brand-greyLight px-1">ONEDRIVE_CLIENT_ID</code> and{" "}
                <code className="rounded bg-brand-greyLight px-1">ONEDRIVE_CLIENT_SECRET</code> in the environment,
                then reload this page.
              </p>
            </div>
          ) : connection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  <Cloud className="h-3.5 w-3.5" /> Connected
                </span>
                {storageProvider !== "onedrive" && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    STORAGE_PROVIDER is &quot;{storageProvider}&quot;
                  </span>
                )}
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Account</dt>
                  <dd className="truncate font-medium">{connection.accountEmail ?? connection.accountName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Folder</dt>
                  <dd className="font-medium">{ROOT_FOLDER}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Connected</dt>
                  <dd className="font-medium">{formatDateTime(connection.connectedAt)}</dd>
                </div>
              </dl>

              {connection.lastError && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="font-medium">The link needs re-authorising</p>
                    <p className="mt-0.5">{connection.lastError}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/api/onedrive/connect"
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand-greyBorder bg-white px-3 py-1.5 text-sm hover:bg-brand-greyLight transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" /> Reconnect
                </a>
                <form action={doDisconnect}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Disconnect
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Not connected. Sign in with the Microsoft account that owns the OneDrive where documents should be
                stored.
              </p>
              <a
                href="/api/onedrive/connect"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navyDark transition-colors"
              >
                <Cloud className="h-4 w-4" /> Connect OneDrive
              </a>
            </div>
          )}
        </SectionCard>

        {/* ── System overview ──────────────────────────────────────────── */}
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
              <dd className="font-medium capitalize">{storageProvider}</dd>
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
      </div>
    </div>
  );
}
