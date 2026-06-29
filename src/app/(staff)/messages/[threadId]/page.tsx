import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";
import { MessageComposer } from "@/components/messages/MessageComposer";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const thread = await db.messageThread.findUnique({ where: { id: threadId }, select: { subject: true } });
  return { title: thread?.subject ?? "Thread" };
}

export default async function MessageThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  await requireStaff();
  const { threadId } = await params;

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      client: { select: { id: true, businessName: true } },
      engagement: { select: { id: true, title: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!thread) notFound();

  const isInternal = thread.threadType === "INTERNAL";

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/clients/${thread.client.id}?tab=messages`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {thread.client.businessName}
        </Link>
      </div>

      <PageHeader
        title={thread.subject ?? "Untitled thread"}
        action={
          <div className="flex items-center gap-2">
            {isInternal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-plum/10 px-3 py-1 text-xs font-medium text-brand-plum">
                <Lock className="h-3 w-3" />
                Internal
              </span>
            )}
            <StatusBadge status={thread.status} />
          </div>
        }
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-3 mb-5">
        <Link href={`/clients/${thread.client.id}`} className="hover:text-brand-navy font-medium">
          {thread.client.businessName}
        </Link>
        {thread.engagement && (
          <>
            <span>·</span>
            <span>{thread.engagement.title}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="mt-6 space-y-4">
        {thread.messages.length === 0 ? (
          <div className="rounded-lg border border-brand-greyBorder bg-white p-8 text-center text-sm text-muted-foreground">
            No messages in this thread yet.
          </div>
        ) : (
          thread.messages.map((msg) => {
            const isClientAuthor = msg.author.role === "CLIENT_USER";
            return (
              <div
                key={msg.id}
                className={`rounded-lg border p-4 ${
                  msg.isInternal
                    ? "border-brand-plum/20 bg-brand-plum/5"
                    : isClientAuthor
                    ? "border-brand-greyBorder bg-brand-greyLight/50"
                    : "border-brand-navy/10 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{msg.author.name}</span>
                    {isClientAuthor && (
                      <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs font-medium text-brand-navy">
                        Client
                      </span>
                    )}
                    {msg.isInternal && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-plum/10 px-2 py-0.5 text-xs font-medium text-brand-plum">
                        <Lock className="h-3 w-3" />
                        Internal note
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.body}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Reply */}
      <div className="mt-5 rounded-lg border border-brand-greyBorder bg-white p-4 shadow-sm">
        {thread.status === "CLOSED" ? (
          <p className="text-center text-sm text-muted-foreground">This thread is closed.</p>
        ) : (
          <MessageComposer threadId={thread.id} isStaff />
        )}
      </div>
    </div>
  );
}
