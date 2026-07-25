"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationType, Priority, ProjectRole, TaskStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireProjectMembership, requireProjectRole, canEditContent } from "@/lib/permissions";
import { sendAssignmentEmail } from "@/lib/email";
import {
  createTaskSchema,
  githubLinkSchema,
  subtaskSchema,
  updateTaskSchema,
} from "@/lib/validations/task";

async function notifyTaskAssignee({
  taskId,
  taskTitle,
  projectId,
  assigneeId,
  actorId,
}: {
  taskId: string;
  taskTitle: string;
  projectId: string;
  assigneeId: string;
  actorId: string;
}) {
  const [actor, assignee] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId } }),
    prisma.user.findUnique({ where: { id: assigneeId } }),
  ]);

  await prisma.notification.create({
    data: {
      userId: assigneeId,
      type: NotificationType.TAREFA_ATRIBUIDA,
      title: `Foste atribuído à tarefa "${taskTitle}"`,
      link: `/projetos/${projectId}/tarefas/${taskId}`,
    },
  });

  if (assignee?.email) {
    try {
      await sendAssignmentEmail({
        to: assignee.email,
        assignerName: actor?.name ?? actor?.email ?? "Um colega",
        entityLabel: "a tarefa",
        entityTitle: taskTitle,
        link: `/projetos/${projectId}/tarefas/${taskId}`,
      });
    } catch (error) {
      console.error("Falha ao enviar email de atribuição de tarefa:", error);
    }
  }
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

async function requireTaskAccess(taskId: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const membership = await requireProjectMembership(userId, task.projectId);
  return { userId, task, membership };
}

export type TaskFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createTaskAction(
  projectId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const assigneeId = formData.get("assigneeId");
  const deadline = formData.get("deadline");

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    assigneeId: assigneeId ? String(assigneeId) : "",
    deadline: deadline ? String(deadline) : "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, description, priority } = parsed.data;

  const maxPosition = await prisma.task.aggregate({
    where: { projectId, status: TaskStatus.TODO },
    _max: { position: true },
  });

  const task = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: { taskSeq: { increment: 1 } },
    });

    return tx.task.create({
      data: {
        projectId,
        number: project.taskSeq,
        title,
        description: description || "",
        priority,
        assigneeId: parsed.data.assigneeId || userId,
        createdById: userId,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });
  });

  await logActivity({
    projectId,
    userId,
    action: "tarefa.criada",
    entityType: "task",
    entityId: task.id,
    metadata: { title: task.title, number: task.number },
  });

  if (task.assigneeId && task.assigneeId !== userId) {
    await notifyTaskAssignee({
      taskId: task.id,
      taskTitle: task.title,
      projectId,
      assigneeId: task.assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${projectId}/tarefas`);
  revalidatePath(`/projetos/${projectId}/tarefas/lista`);
  redirect(`/projetos/${projectId}/tarefas/${task.id}`);
}

export async function updateTaskDetailsAction(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { task, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar esta tarefa." };
  }

  const parsed = updateTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { title: parsed.data.title, description: parsed.data.description || "" },
  });

  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
  return {};
}

export async function setTaskStatusAction(taskId: string, status: TaskStatus) {
  const { task, userId, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  const count = await prisma.task.count({
    where: { projectId: task.projectId, status, parentTaskId: task.parentTaskId },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: { status, position: count },
  });

  if (task.status !== status) {
    await logActivity({
      projectId: task.projectId,
      userId,
      action: "tarefa.status_alterado",
      entityType: "task",
      entityId: taskId,
      metadata: { status },
    });
  }

  revalidatePath(`/projetos/${task.projectId}/tarefas`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/lista`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
}

export async function updateTaskPriorityAction(taskId: string, priority: Priority) {
  const { task, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  await prisma.task.update({ where: { id: taskId }, data: { priority } });

  revalidatePath(`/projetos/${task.projectId}/tarefas`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/lista`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
}

export async function updateTaskAssigneeAction(taskId: string, assigneeId: string | null) {
  const { task, userId, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  if (assigneeId) {
    await requireProjectMembership(assigneeId, task.projectId);
  }

  await prisma.task.update({ where: { id: taskId }, data: { assigneeId } });

  await logActivity({
    projectId: task.projectId,
    userId,
    action: "tarefa.atribuida",
    entityType: "task",
    entityId: taskId,
    metadata: { assigneeId },
  });

  if (assigneeId && assigneeId !== userId) {
    await notifyTaskAssignee({
      taskId,
      taskTitle: task.title,
      projectId: task.projectId,
      assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${task.projectId}/tarefas`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/lista`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
}

export async function updateTaskDeadlineAction(taskId: string, deadline: string | null) {
  const { task, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { deadline: deadline ? new Date(deadline) : null },
  });

  revalidatePath(`/projetos/${task.projectId}/tarefas`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/lista`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
}

// Usado tanto pelo drag-and-drop do kanban como pela vista lista.
// orderedIdsInTargetColumn inclui a tarefa movida na posicao final desejada.
export async function moveTaskAction(
  taskId: string,
  targetStatus: TaskStatus,
  orderedIdsInTargetColumn: string[],
) {
  const { task, userId, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  const statusChanged = task.status !== targetStatus;

  await prisma.$transaction([
    prisma.task.update({ where: { id: taskId }, data: { status: targetStatus } }),
    ...orderedIdsInTargetColumn.map((id, index) =>
      prisma.task.update({ where: { id }, data: { position: index } }),
    ),
  ]);

  if (statusChanged) {
    await logActivity({
      projectId: task.projectId,
      userId,
      action: "tarefa.status_alterado",
      entityType: "task",
      entityId: taskId,
      metadata: { status: targetStatus },
    });
  }

  revalidatePath(`/projetos/${task.projectId}/tarefas`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/lista`);
  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
}

export async function createSubtaskAction(
  parentTaskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { task, userId, membership } = await requireTaskAccess(parentTaskId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar esta tarefa." };
  }

  const parsed = subtaskSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const project = await prisma.project.update({
    where: { id: task.projectId },
    data: { taskSeq: { increment: 1 } },
  });

  await prisma.task.create({
    data: {
      projectId: task.projectId,
      number: project.taskSeq,
      title: parsed.data.title,
      parentTaskId,
      priority: task.priority,
      createdById: userId,
    },
  });

  revalidatePath(`/projetos/${task.projectId}/tarefas/${parentTaskId}`);
  return {};
}

export async function toggleSubtaskDoneAction(subtaskId: string) {
  const { task, membership } = await requireTaskAccess(subtaskId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  const nextStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
  await prisma.task.update({ where: { id: subtaskId }, data: { status: nextStatus } });

  if (task.parentTaskId) {
    revalidatePath(`/projetos/${task.projectId}/tarefas/${task.parentTaskId}`);
  }
}

export async function addTaskGithubLinkAction(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { task, membership } = await requireTaskAccess(taskId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar esta tarefa." };
  }

  const parsed = githubLinkSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const match = parsed.data.url.match(/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/(\d+)/);
  if (!match) {
    return { error: "URL inválido." };
  }

  const type = match[1] === "pull" ? "PR" : "ISSUE";
  const number = Number(match[2]);

  await prisma.taskGithubLink.upsert({
    where: { taskId_type_number: { taskId, type, number } },
    create: { taskId, type, number, url: parsed.data.url },
    update: { url: parsed.data.url },
  });

  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
  return {};
}

export async function deleteTaskGithubLinkAction(linkId: string) {
  const link = await prisma.taskGithubLink.findUniqueOrThrow({
    where: { id: linkId },
    include: { task: true },
  });
  const userId = await requireUserId();
  const membership = await requireProjectMembership(userId, link.task.projectId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta tarefa.");
  }

  await prisma.taskGithubLink.delete({ where: { id: linkId } });

  revalidatePath(`/projetos/${link.task.projectId}/tarefas/${link.taskId}`);
}

export async function addTaskCommentAction(
  taskId: string,
  _prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { task, userId } = await requireTaskAccess(taskId);

  const body = formData.get("body");
  if (typeof body !== "string" || body.trim().length === 0) {
    return { fieldErrors: { body: ["O comentário não pode estar vazio"] } };
  }

  await prisma.comment.create({ data: { taskId, authorId: userId, body } });

  revalidatePath(`/projetos/${task.projectId}/tarefas/${taskId}`);
  return {};
}
