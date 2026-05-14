import { requireClientUser } from "@/lib/permissions";
import { getPortalScope } from "@/lib/portal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { timeAgo } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Messages" };

export default async function PortalMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; threadId?: string }>;
}) {
  const session = await requireClientUser();
  const scope = await getPortalScope(session.user.id);

  if (!scope) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Your account is not linked to a client. Please contact your accountant.</p>
      </div>
    );
  }

  const { status, threadId } = await searchParams;

  const threads = await db.messageThread.findMany({
    where: {
      clientId: scope.clientId,
      threadType: "CLIENT_STAFF",
      ...(status ? { status: status as never } : {}),
    },
    include: {
      engagement: { select: { id: true, title: true } },
      messages: {
        where: { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const activeThread = threadId
    ? threads.find((t) => t.id === threadId) ?? null
    : threads[0] ?? null;

  const threadMessages = activeThread
    ? await db.message.findMany({
        where: {
          threadId: activeThread.id,
          isInternal: false,
        },
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      })
    : [];

  const STATUS_OPTS = ["OPEN", "WAITING_ON_STAFF", "WAITING_ON_CLIENT", "CLOSED"];

  return (
    <div>
      <PageHeader title="Messages" description="Communicate securely with your accounting team." />

      {/* Filter */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {status && (
          <a href="/portal/messages" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" description="Your accounting team will reach out here." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Thread list */}
          <div className="lg:col-span-1 rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden divide-y divide-brand-greyBorder">
            {threads.map((thread) => {
              const last = thread.messages[0];
              const isActive = thread.id === activeThread?.id;
              return (
                <a
                  key={thread.id}
                  href={`/portal/messages?${new URLSearchParams({ ...(status ? { status } : {}), threadId: thread.id }).toString()}`}
                  className={`block px-4 py-3 hover:bg-brand-greyLight/50 transition-colors ${isActive ? "bg-brand-navy/5 border-l-2 border-brand-navy" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{thread.subject ?? "Message thread"}</p>
                    <StatusBadge status={thread.status} />
                  </div>
                  {thread.engagement && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{thread.engagement.title}</p>
                  )}
                  {last && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {last.author.name}: {last.body.slice(0, 50)}{last.body.length > 50 ? "…" : ""}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(thread.updatedAt)}</p>
                </a>
              );
            })}
          </div>

          {/* Message view */}
          <div className="lg:col-span-2 rounded-lg border border-brand-greyBorder bg-white shadow-sm flex flex-col min-h-[400px]">
            {activeThread ? (
              <>
                {/* Thread header */}
                <div className="px-5 py-4 border-b border-brand-greyBorder">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{activeThread.subject ?? "Message thread"}</p>
                      {activeThread.engagement && (
                        <p className="text-xs text-muted-foreground mt-0.5">{activeThread.engagement.title}</p>
                      )}
                    </div>
                    <StatusBadge status={activeThread.status} />
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {threadMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages in this thread yet.</p>
                  ) : (
                    threadMessages.map((msg) => {
                      const isClientMsg = msg.author.role === "CLIENT_USER";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isClientMsg ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
                            isClientMsg
                              ? "bg-brand-navy text-white"
                              : "bg-brand-greyLight text-foreground"
                          }`}>
                            <p className={`text-xs font-medium mb-1 ${isClientMsg ? "text-white/70" : "text-muted-foreground"}`}>
                              {msg.author.name}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                            <p className={`text-xs mt-1.5 ${isClientMsg ? "text-white/60" : "text-muted-foreground"}`}>
                              {timeAgo(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply note */}
                {activeThread.status !== "CLOSED" && (
                  <div className="px-5 py-4 border-t border-brand-greyBorder bg-brand-greyLight/50">
                    <p className="text-xs text-muted-foreground text-center">
                      To reply, contact your accounting team directly. Replies will appear here.
                    </p>
                  </div>
                )}
                {activeThread.status === "CLOSED" && (
                  <div className="px-5 py-3 border-t border-brand-greyBorder">
                    <p className="text-xs text-muted-foreground text-center">This thread is closed.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a thread to view messages.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
