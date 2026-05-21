import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { timeAgo } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

interface ClientMessagesTabProps {
  clientId: string;
}

export async function ClientMessagesTab({ clientId }: ClientMessagesTabProps) {
  const threads = await db.messageThread.findMany({
    where: { clientId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <SectionCard
      title="Message Threads"
      description={`${threads.length} thread${threads.length !== 1 ? "s" : ""}`}
    >
      {threads.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No message threads"
          description="Message threads for this client will appear here."
        />
      ) : (
        <div className="divide-y divide-brand-greyBorder">
          {threads.map((thread) => {
            const lastMessage = thread.messages[0];
            const isInternal = thread.threadType === "INTERNAL";
            return (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className="block py-4 first:pt-0 last:pb-0 hover:bg-brand-greyLight/50 -mx-4 px-4 rounded-md transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {thread.subject ?? "Untitled thread"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          isInternal
                            ? "bg-brand-plum/10 text-brand-plum"
                            : "bg-brand-navy/10 text-brand-navy"
                        }`}
                      >
                        {isInternal ? "Internal" : "Client"}
                      </span>
                    </div>
                    {lastMessage ? (
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        <span className="font-medium">{lastMessage.author.name}:</span>{" "}
                        {lastMessage.body.slice(0, 80)}
                        {lastMessage.body.length > 80 ? "…" : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">No messages yet</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={thread.status} />
                    <span className="text-xs text-muted-foreground">{timeAgo(thread.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
