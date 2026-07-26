import Link from "next/link";
import { Plus, Folder } from "lucide-react";
import { TaskStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { KanbanTask } from "@/components/tasks/task-card";
import { CreateFolderPopover } from "@/components/tasks/create-folder-popover";
import { TaskFolderActions } from "@/components/tasks/task-folder-actions";
import { cn } from "@/lib/utils";

function buildFolderDepths(folders: { id: string; parentId: string | null }[]) {
  const depthById = new Map<string, number>();
  function depthOf(id: string): number {
    if (depthById.has(id)) return depthById.get(id)!;
    const folder = folders.find((f) => f.id === id);
    const depth = folder?.parentId ? depthOf(folder.parentId) + 1 : 0;
    depthById.set(id, depth);
    return depth;
  }
  for (const folder of folders) depthOf(folder.id);
  return depthById;
}

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
  const depths = buildFolderDepths(folders);

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
    <div className="flex gap-8">
      <aside className="w-56 shrink-0 space-y-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Pastas</span>
          {canEdit && <CreateFolderPopover projectId={projectId} />}
        </div>
        <Link
          href={`/projetos/${projectId}/tarefas`}
          className={cn(
            "block rounded-md px-2 py-1.5 text-sm hover:bg-accent",
            !folder && "bg-accent font-medium",
          )}
        >
          Todas as tarefas
        </Link>
        {folders.map((f) => (
          <div
            key={f.id}
            className={cn(
              "group flex items-center justify-between rounded-md pr-1 text-sm hover:bg-accent",
              folder === f.id && "bg-accent font-medium",
            )}
          >
            <Link
              href={`/projetos/${projectId}/tarefas?folder=${f.id}`}
              style={{ paddingLeft: `${8 + (depths.get(f.id) ?? 0) * 12}px` }}
              className="flex flex-1 items-center gap-1.5 py-1.5"
            >
              <Folder className="size-3.5 text-muted-foreground" />
              {f.name}
            </Link>
            {canEdit && (
              <span className="opacity-0 group-hover:opacity-100">
                <TaskFolderActions folderId={f.id} name={f.name} />
              </span>
            )}
          </div>
        ))}
      </aside>

      <div className="flex-1">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">Tarefas</h1>
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
    </div>
  );
}
