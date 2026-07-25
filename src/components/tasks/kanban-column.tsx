"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskStatus } from "@prisma/client";

import { TaskCard, type KanbanTask } from "@/components/tasks/task-card";
import { TASK_STATUS_LABELS } from "@/components/shared/task-status-badge";

export function KanbanColumn({
  status,
  tasks,
  projectId,
}: {
  status: TaskStatus;
  tasks: KanbanTask[];
  projectId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium">{TASK_STATUS_LABELS[status]}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-b-lg p-2 transition-colors ${
          isOver ? "bg-accent/50" : ""
        }`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} projectId={projectId} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
