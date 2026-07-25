"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarClock, GripVertical, ListChecks } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { cn } from "@/lib/utils";

export type KanbanTask = {
  id: string;
  number: number;
  title: string;
  priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
  deadline: string | null;
  assignee: { name: string | null; email: string | null; image: string | null } | null;
  subtasksTotal: number;
  subtasksDone: number;
};

export function TaskCard({
  task,
  projectId,
  overlay,
}: {
  task: KanbanTask;
  projectId: string;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assigneeLabel = task.assignee?.name ?? task.assignee?.email;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-2 rounded-lg border bg-card p-3 shadow-sm",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/projetos/${projectId}/tarefas/${task.id}`}
          className="text-sm font-medium hover:underline"
        >
          {task.title}
        </Link>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Arrastar tarefa"
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.assignee && (
          <Avatar className="size-6">
            <AvatarImage src={task.assignee.image ?? undefined} alt={assigneeLabel ?? ""} />
            <AvatarFallback className="text-[10px]">
              {assigneeLabel?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      {(task.deadline || task.subtasksTotal > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.deadline && (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {format(new Date(task.deadline), "d MMM", { locale: pt })}
            </span>
          )}
          {task.subtasksTotal > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3" />
              {task.subtasksDone}/{task.subtasksTotal}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
