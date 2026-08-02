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
import { FolderMenu } from "@/components/tasks/folder-menu";

export default async function TasksKanbanPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { projectId } = await params;
  const { folder } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, folders, tasks] = await Promise.all([
    getMembership(projectId, userId),
    prisma.taskFolder.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: { projectId, parentTaskId: null, ...(folder ? { folderId: folder } : {}) },
      orderBy: { position: "asc" },
      include: {
        assignee: { select: { name: true, email: true, image: true } },
        _count: { select: { subtasks: true } },
        subtasks: { select: { status: true } },
      },
    }),
  ]);

  const canEdit = canEditContent(membership.role);

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Tarefas</h1>
          <FolderMenu
            projectId={projectId}
            basePath={`/projetos/${projectId}/tarefas`}
            folders={folders}
            currentFolderId={folder}
            canEdit={canEdit}
          />
          <Link
            href={`/projetos/${projectId}/tarefas/lista${folder ? `?folder=${folder}` : ""}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Ver como lista
          </Link>
        </div>
        {canEdit && (
          <Button
            render={
              <Link href={`/projetos/${projectId}/tarefas/novo${folder ? `?folder=${folder}` : ""}`}>
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
