import { db } from "@/lib/db";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { OverdueIndicator } from "@/components/shared/OverdueIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import { CheckSquare } from "lucide-react";

export async function ClientTasksTab({ clientId }: { clientId: string }) {
  const tasks = await db.task.findMany({
    where: { clientId },
    include: {
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <SectionCard title="Tasks" description={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}>
      {tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Tasks linked to this client will appear here." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-greyBorder">
              <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Task</th>
              <th className="pb-2 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="pb-2 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Priority</th>
              <th className="pb-2 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Assigned to</th>
              <th className="pb-2 text-left text-xs font-semibold text-muted-foreground">Due date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-greyBorder">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-brand-greyLight/50">
                <td className="py-3 pr-3">
                  <div>
                    <span className="font-medium text-foreground">{task.title}</span>
                    {task.clientVisible && (
                      <span className="ml-2 text-xs text-brand-navy">Client visible</span>
                    )}
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{task.description}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-3 hidden sm:table-cell">
                  <StatusBadge status={task.status} />
                </td>
                <td className="py-3 pr-3 hidden md:table-cell">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="py-3 pr-3 hidden lg:table-cell text-muted-foreground">
                  {task.assignedTo?.name ?? "—"}
                </td>
                <td className="py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">{task.dueDate ? formatDate(task.dueDate) : "—"}</span>
                    <OverdueIndicator dueDate={task.dueDate} status={task.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );
}
