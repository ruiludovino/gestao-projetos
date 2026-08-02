import Link from "next/link";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Bug as BugIcon, CalendarClock, CheckSquare } from "lucide-react";

import { PriorityBadge } from "@/components/shared/priority-badge";
import { projectTagColor } from "@/lib/project-color";
import { cn } from "@/lib/utils";
import type { Priority } from "@prisma/client";

export type WorkItem = {
  id: string;
  kind: "task" | "bug";
  number: number;
  title: string;
  priority: Priority;
  deadline: string | null;
  projectId: string;
  projectName: string;
};

export function WorkItemCard({ item }: { item: WorkItem }) {
  const href =
    item.kind === "task"
      ? `/projetos/${item.projectId}/tarefas/${item.id}`
      : `/projetos/${item.projectId}/bugs/${item.id}`;

  return (
    <Link
      href={href}
      className="block space-y-2 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-foreground/30"
    >
      <span
        className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          projectTagColor(item.projectId),
        )}
      >
        {item.projectName}
      </span>
      <p className="text-sm font-medium">{item.title}</p>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={item.priority} />
        <span className="text-muted-foreground" title={item.kind === "task" ? "Tarefa" : "Bug"}>
          {item.kind === "task" ? (
            <CheckSquare className="size-3.5" />
          ) : (
            <BugIcon className="size-3.5" />
          )}
        </span>
      </div>
      {item.deadline && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3" />
          {format(new Date(item.deadline), "d MMM", { locale: pt })}
        </div>
      )}
    </Link>
  );
}
