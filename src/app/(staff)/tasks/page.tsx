import { requireStaff } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { OverdueIndicator } from "@/components/shared/OverdueIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CheckSquare } from "lucide-react";

export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; assignedToId?: string }>;
}) {
  await requireStaff();
  const { status, priority, assignedToId } = await searchParams;

  const [tasks, staffUsers] = await Promise.all([
    db.task.findMany({
      where: {
        status: status ? (status as never) : { not: "CANCELLED" },
        ...(priority ? { priority: priority as never } : {}),
        ...(assignedToId ? { assignedToId } : {}),
      },
      include: {
        client: { select: { id: true, businessName: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    db.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "CPA_ADMIN", "ASSISTANT"] }, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const STATUS_OPTS = ["TO_DO","IN_PROGRESS","WAITING_ON_CLIENT","DONE","CANCELLED"];
  const PRIORITY_OPTS = ["LOW","MEDIUM","HIGH","URGENT"];

  return (
    <div>
      <PageHeader title="Tasks" description={`${tasks.length} task${tasks.length !== 1 ? "s" : ""}`} />

      {/* Filters */}
      <form className="mb-5 flex flex-wrap gap-3">
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All priorities</option>
          {PRIORITY_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select name="assignedToId" defaultValue={assignedToId ?? ""} className="h-9 rounded-md border border-brand-greyBorder bg-white px-3 text-sm">
          <option value="">All assignees</option>
          {staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-navy px-4 text-sm font-medium text-white hover:bg-brand-navyDark">Filter</button>
        {(status || priority || assignedToId) && (
          <a href="/tasks" className="h-9 flex items-center rounded-md border border-brand-greyBorder px-4 text-sm text-muted-foreground hover:bg-brand-greyLight">Clear</a>
        )}
      </form>

      {tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks found" />
      ) : (
        <div className="rounded-lg border border-brand-greyBorder bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-greyBorder bg-brand-greyLight">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Task</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Assigned to</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-greyBorder">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-brand-greyLight/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.clientVisible && (
                        <span className="text-xs text-brand-navy">Client visible</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {task.client ? (
                      <Link href={`/clients/${task.client.id}?tab=tasks`} className="text-muted-foreground hover:text-brand-navy">
                        {task.client.businessName}
                      </Link>
                    ) : <span className="text-muted-foreground">General</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><PriorityBadge priority={task.priority} /></td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {task.assignedTo?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">{task.dueDate ? formatDate(task.dueDate) : "—"}</span>
                      <OverdueIndicator dueDate={task.dueDate} status={task.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
