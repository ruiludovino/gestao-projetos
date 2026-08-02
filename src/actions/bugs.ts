"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { put, del } from "@vercel/blob";
import { BugStatus, NotificationType, Priority, ProjectRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import {
  requireProjectMembership,
  requireProjectRole,
  canEditContent,
  isCurrentUserOwner,
  canDeleteOwnRecord,
} from "@/lib/permissions";
import { createGithubIssue } from "@/lib/github";
import { sendAssignmentEmail } from "@/lib/email";
import {
  commentSchema,
  createBugSchema,
  createLabelSchema,
  updateBugSchema,
} from "@/lib/validations/bug";

async function notifyBugAssignee({
  bugId,
  bugTitle,
  projectId,
  assigneeId,
  actorId,
}: {
  bugId: string;
  bugTitle: string;
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
      type: NotificationType.BUG_ATRIBUIDO,
      title: `Foste atribuído ao bug "${bugTitle}"`,
      link: `/projetos/${projectId}/bugs/${bugId}`,
    },
  });

  if (assignee?.email) {
    try {
      await sendAssignmentEmail({
        to: assignee.email,
        assignerName: actor?.name ?? actor?.email ?? "Um colega",
        entityLabel: "o bug",
        entityTitle: bugTitle,
        link: `/projetos/${projectId}/bugs/${bugId}`,
      });
    } catch (error) {
      console.error("Falha ao enviar email de atribuição de bug:", error);
    }
  }
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

async function requireBugAccess(bugId: string) {
  const userId = await requireUserId();
  const bug = await prisma.bug.findUnique({ where: { id: bugId } });
  if (!bug) notFound();
  const membership = await requireProjectMembership(userId, bug.projectId);
  return { userId, bug, membership };
}

export type BugFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createBugAction(
  projectId: string,
  _prevState: BugFormState,
  formData: FormData,
): Promise<BugFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const labelIds = formData.getAll("labelIds").map(String);
  const assigneeId = formData.get("assigneeId");

  const parsed = createBugSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    assigneeId: assigneeId ? String(assigneeId) : "",
    labelIds,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, description, priority } = parsed.data;

  const bug = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: { bugSeq: { increment: 1 } },
    });

    return tx.bug.create({
      data: {
        projectId,
        number: project.bugSeq,
        title,
        description: description || "",
        priority,
        reporterId: userId,
        assigneeId: parsed.data.assigneeId || userId,
        labels: labelIds.length
          ? { create: labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
    });
  });

  await logActivity({
    projectId,
    userId,
    action: "bug.criado",
    entityType: "bug",
    entityId: bug.id,
    metadata: { title: bug.title, number: bug.number },
  });

  if (bug.assigneeId && bug.assigneeId !== userId) {
    await notifyBugAssignee({
      bugId: bug.id,
      bugTitle: bug.title,
      projectId,
      assigneeId: bug.assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${projectId}/bugs`);
  redirect(`/projetos/${projectId}/bugs`);
}

export async function updateBugDetailsAction(
  bugId: string,
  _prevState: BugFormState,
  formData: FormData,
): Promise<BugFormState> {
  const { bug, membership } = await requireBugAccess(bugId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar este bug." };
  }

  const parsed = updateBugSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.bug.update({
    where: { id: bugId },
    data: { title: parsed.data.title, description: parsed.data.description || "" },
  });

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
  return {};
}

export async function updateBugStatusAction(bugId: string, status: BugStatus) {
  const { bug, userId, membership } = await requireBugAccess(bugId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar este bug.");
  }

  const isClosing = status === BugStatus.RESOLVIDO || status === BugStatus.FECHADO;

  await prisma.bug.update({
    where: { id: bugId },
    data: { status, closedAt: isClosing ? new Date() : null },
  });

  await logActivity({
    projectId: bug.projectId,
    userId,
    action: "bug.status_alterado",
    entityType: "bug",
    entityId: bugId,
    metadata: { status },
  });

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
  revalidatePath(`/projetos/${bug.projectId}/bugs`);
}

export async function deleteBugAction(bugId: string) {
  const { bug, userId } = await requireBugAccess(bugId);
  const isOwner = await isCurrentUserOwner();
  if (!canDeleteOwnRecord({ isOwner, creatorId: bug.reporterId, userId })) {
    throw new Error("Só podes apagar bugs que tu próprio reportaste.");
  }

  await prisma.bug.delete({ where: { id: bugId } });

  await logActivity({
    projectId: bug.projectId,
    userId,
    action: "bug.removido",
    entityType: "bug",
    entityId: bugId,
    metadata: { title: bug.title },
  });

  revalidatePath(`/projetos/${bug.projectId}/bugs`);
}

export async function copyBugToProjectAction(bugId: string, targetProjectId: string) {
  const { bug, userId } = await requireBugAccess(bugId);
  await requireProjectRole(userId, targetProjectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const newBug = await prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: targetProjectId },
      data: { bugSeq: { increment: 1 } },
    });

    return tx.bug.create({
      data: {
        projectId: targetProjectId,
        number: project.bugSeq,
        title: bug.title,
        description: bug.description,
        priority: bug.priority,
        reporterId: userId,
      },
    });
  });

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "bug.copiado",
    entityType: "bug",
    entityId: newBug.id,
    metadata: { title: newBug.title, fromProjectId: bug.projectId, fromBugId: bug.id },
  });

  revalidatePath(`/projetos/${targetProjectId}/bugs`);
  return { id: newBug.id };
}

export async function updateBugPriorityAction(bugId: string, priority: Priority) {
  const { bug, membership } = await requireBugAccess(bugId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar este bug.");
  }

  await prisma.bug.update({ where: { id: bugId }, data: { priority } });

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
  revalidatePath(`/projetos/${bug.projectId}/bugs`);
}

export async function updateBugAssigneeAction(bugId: string, assigneeId: string | null) {
  const { bug, userId, membership } = await requireBugAccess(bugId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar este bug.");
  }

  if (assigneeId) {
    await requireProjectMembership(assigneeId, bug.projectId);
  }

  await prisma.bug.update({ where: { id: bugId }, data: { assigneeId } });

  await logActivity({
    projectId: bug.projectId,
    userId,
    action: "bug.atribuido",
    entityType: "bug",
    entityId: bugId,
    metadata: { assigneeId },
  });

  if (assigneeId && assigneeId !== userId) {
    await notifyBugAssignee({
      bugId,
      bugTitle: bug.title,
      projectId: bug.projectId,
      assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
  revalidatePath(`/projetos/${bug.projectId}/bugs`);
}

export async function addBugCommentAction(
  bugId: string,
  _prevState: BugFormState,
  formData: FormData,
): Promise<BugFormState> {
  const { bug, userId } = await requireBugAccess(bugId);

  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.comment.create({
    data: { bugId, authorId: userId, body: parsed.data.body },
  });

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
  return {};
}

export async function toggleBugLabelAction(bugId: string, labelId: string, checked: boolean) {
  const { bug, membership } = await requireBugAccess(bugId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar este bug.");
  }

  if (checked) {
    await prisma.bugLabel.upsert({
      where: { bugId_labelId: { bugId, labelId } },
      create: { bugId, labelId },
      update: {},
    });
  } else {
    await prisma.bugLabel.deleteMany({ where: { bugId, labelId } });
  }

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
}

export async function createLabelAction(
  projectId: string,
  _prevState: BugFormState,
  formData: FormData,
): Promise<BugFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const parsed = createLabelSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.label.findUnique({
    where: { projectId_name: { projectId, name: parsed.data.name } },
  });
  if (existing) {
    return { error: "Já existe uma label com este nome." };
  }

  await prisma.label.create({ data: { projectId, ...parsed.data } });

  revalidatePath(`/projetos/${projectId}/bugs`);
  return {};
}

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadAttachmentAction(bugId: string, formData: FormData) {
  const { bug, userId } = await requireBugAccess(bugId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Nenhum ficheiro selecionado.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Só são permitidas imagens.");
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("A imagem não pode exceder 5MB.");
  }

  const blob = await put(`bugs/${bugId}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  await prisma.attachment.create({
    data: {
      bugId,
      url: blob.url,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedById: userId,
    },
  });

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
}

export async function deleteAttachmentAction(attachmentId: string) {
  const userId = await requireUserId();
  const attachment = await prisma.attachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: { bug: true },
  });

  const membership = await requireProjectMembership(userId, attachment.bug.projectId);
  if (attachment.uploadedById !== userId && !canEditContent(membership.role)) {
    throw new Error("Não tens permissão para remover este anexo.");
  }

  await del(attachment.url).catch(() => undefined);
  await prisma.attachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/projetos/${attachment.bug.projectId}/bugs/${attachment.bugId}`);
}

export async function createGithubIssueAction(bugId: string) {
  const { bug, userId } = await requireBugAccess(bugId);
  const session = await auth();

  if (!session?.githubAccessToken) {
    throw new Error(
      "Faz login com GitHub (com scope de repo) para criar issues a partir daqui.",
    );
  }

  const repo = await prisma.githubRepo.findFirst({ where: { projectId: bug.projectId } });
  if (!repo) {
    throw new Error("Nenhum repositório GitHub ligado a este projeto ainda.");
  }

  const issue = await createGithubIssue(session.githubAccessToken, repo.owner, repo.name, {
    title: `[${bug.priority}] ${bug.title}`,
    body: bug.description,
  });

  await prisma.bug.update({
    where: { id: bugId },
    data: { githubIssueNumber: issue.number, githubIssueUrl: issue.html_url },
  });

  await logActivity({
    projectId: bug.projectId,
    userId,
    action: "github.issue_criada",
    entityType: "bug",
    entityId: bugId,
    metadata: { issueNumber: issue.number },
  });

  revalidatePath(`/projetos/${bug.projectId}/bugs/${bugId}`);
}
