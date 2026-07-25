"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";

import { moveTaskAction } from "@/actions/tasks";
import { KanbanColumn } from "@/components/tasks/kanban-column";
import { TaskCard, type KanbanTask } from "@/components/tasks/task-card";

const COLUMNS: TaskStatus[] = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE];

type ColumnsState = Record<TaskStatus, KanbanTask[]>;

export function KanbanBoard({
  projectId,
  initialColumns,
}: {
  projectId: string;
  initialColumns: ColumnsState;
}) {
  const [columns, setColumns] = useState<ColumnsState>(initialColumns);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const taskLookup = useMemo(() => {
    const map = new Map<string, TaskStatus>();
    for (const status of COLUMNS) {
      for (const task of columns[status]) map.set(task.id, status);
    }
    return map;
  }, [columns]);

  function findColumn(id: string): TaskStatus | undefined {
    if (COLUMNS.includes(id as TaskStatus)) return id as TaskStatus;
    return taskLookup.get(id);
  }

  function handleDragStart(event: DragStartEvent) {
    const status = findColumn(String(event.active.id));
    if (!status) return;
    const task = columns[status].find((t) => t.id === event.active.id) ?? null;
    setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeColumn = findColumn(String(active.id));
    const overColumn = findColumn(String(over.id));
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setColumns((prev) => {
      const activeItems = prev[activeColumn];
      const activeIndex = activeItems.findIndex((t) => t.id === active.id);
      if (activeIndex === -1) return prev;

      const [moved] = activeItems.slice(activeIndex, activeIndex + 1);
      const newActiveItems = activeItems.filter((t) => t.id !== active.id);

      const overItems = prev[overColumn];
      const overIndex = overItems.findIndex((t) => t.id === over.id);
      const insertAt = overIndex === -1 ? overItems.length : overIndex;
      const newOverItems = [
        ...overItems.slice(0, insertAt),
        moved,
        ...overItems.slice(insertAt),
      ];

      return { ...prev, [activeColumn]: newActiveItems, [overColumn]: newOverItems };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const targetColumn = findColumn(String(over.id));
    if (!targetColumn) return;

    const items = columns[targetColumn];
    const activeIndex = items.findIndex((t) => t.id === active.id);
    const overIndex = items.findIndex((t) => t.id === over.id);

    let orderedIds = items.map((t) => t.id);
    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      const reordered = arrayMove(items, activeIndex, overIndex);
      orderedIds = reordered.map((t) => t.id);
      setColumns((prev) => ({ ...prev, [targetColumn]: reordered }));
    }

    void persist(String(active.id), targetColumn, orderedIds);
  }

  function persist(taskId: string, targetStatus: TaskStatus, orderedIds: string[]) {
    return moveTaskAction(taskId, targetStatus, orderedIds).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao mover tarefa.");
    });
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} projectId={projectId} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const copy = array.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
