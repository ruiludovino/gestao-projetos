import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, getCopyTargetProjects } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EditTaskDetailsForm } from "@/components/tasks/edit-task-details-form";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { TaskPrioritySelect } from "@/components/tasks/task-priority-select";
import { TaskAssigneeSelect } from "@/components/tasks/task-assignee-select";
import { TaskDeadlinePicker } from "@/components/tasks/task-deadline-picker";
import { TaskFolderSelect } from "@/components/tasks/task-folder-select";
import { SubtasksSection } from "@/components/tasks/subtasks-section";
import { TaskGithubLinks } from "@/components/tasks/task-github-links";
import { TaskCommentForm } from "@/components/tasks/task-comment-form";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { CopyToProjectDialog } from "@/components/shared/copy-to-project-dialog";
import { copyTaskToProjectAction } from "@/actions/tasks";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, task, members, folders, copyTargetProjects] = await Promise.all([
    getMembership(projectId, userId),
    prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: { orderBy: { createdAt: "asc" } },
        githubLinks: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, email: true, image: true } } },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.taskFolder.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
    getCopyTargetProjects(userId, projectId),
  ]);
  if (!task) notFound();

  const canEdit = canEditContent(membership.role);
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);
  const canDelete = isOwner || task.createdById === userId;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">TASK-{task.number}</span>
        <div className="flex items-center gap-2">
          <CopyToProjectDialog
            projects={copyTargetProjects}
            onCopy={copyTaskToProjectAction.bind(null, task.id)}
            triggerLabel="Copiar para projeto"
          />
          {canDelete && (
            <DeleteTaskButton taskId={task.id} redirectTo={`/projetos/${projectId}/tarefas/lista`} />
          )}
        </div>
      </div>

      <EditTaskDetailsForm
        taskId={task.id}
        title={task.title}
        description={task.description ?? ""}
        canEdit={canEdit}
      />

      <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Estado</p>
          <TaskStatusSelect taskId={task.id} value={task.status} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Prioridade</p>
          <TaskPrioritySelect taskId={task.id} value={task.priority} disabled={!canEdit} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Atribuído a</p>
          <TaskAssigneeSelect
            taskId={task.id}
            value={task.assigneeId}
            members={members}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Deadline</p>
          <TaskDeadlinePicker
            taskId={task.id}
            value={task.deadline?.toISOString() ?? null}
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Pasta</p>
          <TaskFolderSelect
            taskId={task.id}
            value={task.folderId}
            folders={folders}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Subtarefas</p>
        <SubtasksSection parentTaskId={task.id} subtasks={task.subtasks} canEdit={canEdit} />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">GitHub</p>
        <TaskGithubLinks taskId={task.id} links={task.githubLinks} canEdit={canEdit} />
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-medium">Comentários ({task.comments.length})</h2>
        <ul className="space-y-4">
          {task.comments.map((comment) => {
            const label = comment.author.name ?? comment.author.email ?? "?";
            return (
              <li key={comment.id} className="flex gap-3">
                <Avatar className="size-7">
                  <AvatarImage src={comment.author.image ?? undefined} alt={label} />
                  <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <TaskCommentForm taskId={task.id} />
      </div>
    </div>
  );
}
