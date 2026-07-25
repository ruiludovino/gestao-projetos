import Link from "next/link";
import { Plus } from "lucide-react";
import { TaskStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { KanbanTask } from "@/components/tasks/task-card";

export default async function TasksKanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, tasks] = await Promise.all([
    getMembership(projectId, userId),
    prisma.task.findMany({
      where: { projectId, parentTaskId: null },
      orderBy: { position: "asc" },
      include: {
        assignee: { select: { name: true, email: true, image: true } },
        _count: { select: { subtasks: true } },
        subtasks: { select: { status: true } },
      },
    }),
  ]);

  const toKanbanTask = (task: (typeof tasks)[number]): KanbanTask => ({
    id: task.id,
    number: task.number,
    title: task.title,
    priority: task.priority,
    deadline: task.deadline?.toISOString() ?? null,
    assignee: task.assignee,
    subtasksTotal: task._count.subtasks,
    subtasksDone: task.subtasks.filter((s) => s.status === TaskStatus.DONE).length,
  });

  const columns = {
    [TaskStatus.TODO]: tasks.filter((t) => t.status === TaskStatus.TODO).map(toKanbanTask),
    [TaskStatus.DOING]: tasks.filter((t) => t.status === TaskStatus.DOING).map(toKanbanTask),
    [TaskStatus.DONE]: tasks.filter((t) => t.status === TaskStatus.DONE).map(toKanbanTask),
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Tarefas</h1>
          <Link
            href={`/projetos/${projectId}/tarefas/lista`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Ver como lista
          </Link>
        </div>
        {canEditContent(membership.role) && (
          <Button
            render={
              <Link href={`/projetos/${projectId}/tarefas/novo`}>
                <Plus className="size-4" />
                Nova tarefa
              </Link>
            }
          />
        )}
      </div>

      <KanbanBoard projectId={projectId} initialColumns={columns} />
    </div>
  );
}
