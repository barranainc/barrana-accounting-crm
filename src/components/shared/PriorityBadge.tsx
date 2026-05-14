import { cn } from "@/lib/utils";

const priorityClasses: Record<string, string> = {
  LOW:    "badge-priority-low",
  MEDIUM: "badge-priority-medium",
  HIGH:   "badge-priority-high",
  URGENT: "badge-priority-urgent",
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const cls = priorityClasses[priority] ?? "badge-priority-medium";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cls, className)}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}
