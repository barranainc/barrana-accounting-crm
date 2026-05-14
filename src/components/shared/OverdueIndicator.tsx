import { cn, isOverdue } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface OverdueIndicatorProps {
  dueDate?: Date | string | null;
  status?: string;
  className?: string;
}

export function OverdueIndicator({ dueDate, status, className }: OverdueIndicatorProps) {
  if (!isOverdue(dueDate, status)) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-red-600", className)}>
      <AlertTriangle className="h-3 w-3" />
      Overdue
    </span>
  );
}
