import { TaskStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Todo",
  DOING: "Doing",
  DONE: "Done",
};

const CLASSES: Record<TaskStatus, string> = {
  TODO: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  DOING: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  DONE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", CLASSES[status])}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
