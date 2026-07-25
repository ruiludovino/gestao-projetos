import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EditTaskDetailsForm } from "@/components/tasks/edit-task-details-form";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { TaskPrioritySelect } from "@/components/tasks/task-priority-select";
import { TaskAssigneeSelect } from "@/components/tasks/task-assignee-select";
import { TaskDeadlinePicker } from "@/components/tasks/task-deadline-picker";
import { SubtasksSection } from "@/components/tasks/subtasks-section";
import { TaskGithubLinks } from "@/components/tasks/task-github-links";
import { TaskCommentForm } from "@/components/tasks/task-comment-form";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, task, members] = await Promise.all([
    getMembership(projectId, userId),
    prisma.task.findUniqueOrThrow({
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
  ]);

  const canEdit = canEditContent(membership.role);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <span className="font-mono text-sm text-muted-foreground">TASK-{task.number}</span>

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
