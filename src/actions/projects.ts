"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NotificationType, ProjectRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import {
  requireProjectRole,
  requireProjectMembership,
  isCurrentUserOwner,
  canDeleteOwnRecord,
} from "@/lib/permissions";
import { sendProjectInviteEmail } from "@/lib/email";
import { isOwnerEmail } from "@/lib/invites";
import {
  addMemberSchema,
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validations/project";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado.");
  }
  return session.user.id;
}


async function generateUniqueSlug(name: string) {
  const base = slugify(name) || "projeto";
  let slug = base;
  let attempt = 1;
  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${base}-${attempt++}`;
  }
  return slug;
}

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }
  if (!session.user.email || !isOwnerEmail(session.user.email)) {
    return { error: "Só o dono da conta pode criar novos projetos." };
  }
  const userId = session.user.id;

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, description } = parsed.data;
  const slug = await generateUniqueSlug(name);

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      slug,
      createdById: userId,
      members: { create: { userId, role: ProjectRole.ADMIN } },
    },
  });

  await logActivity({
    projectId: project.id,
    userId,
    action: "projeto.criado",
    entityType: "project",
    entityId: project.id,
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${project.id}`);
}

export async function duplicateProjectAction(sourceProjectId: string, newName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }
  if (!session.user.email || !isOwnerEmail(session.user.email)) {
    return { error: "Só o dono da conta pode duplicar projetos." };
  }
  const userId = session.user.id;

  const nameParsed = createProjectSchema.shape.name.safeParse(newName.trim());
  if (!nameParsed.success) {
    return { error: nameParsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  const sourceProject = await prisma.project.findUnique({ where: { id: sourceProjectId } });
  if (!sourceProject) return { error: "Projeto de origem não encontrado." };

  const slug = await generateUniqueSlug(nameParsed.data);

  const newProjectId = await prisma.$transaction(
    async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: nameParsed.data,
          description: sourceProject.description,
          slug,
          createdById: userId,
          members: { create: { userId, role: ProjectRole.ADMIN } },
        },
      });

      // Labels (copiadas primeiro para poder remapear as associacoes dos bugs)
      const labels = await tx.label.findMany({ where: { projectId: sourceProjectId } });
      const labelIdMap = new Map<string, string>();
      for (const label of labels) {
        const created = await tx.label.create({
          data: { projectId: newProject.id, name: label.name, color: label.color },
        });
        labelIdMap.set(label.id, created.id);
      }

      // Pastas de tarefas (criadas por ordem, para os pais existirem antes dos filhos)
      const taskFolders = await tx.taskFolder.findMany({ where: { projectId: sourceProjectId } });
      const taskFolderIdMap = new Map<string, string>();
      const pendingTaskFolders = [...taskFolders];
      while (pendingTaskFolders.length > 0) {
        const idx = pendingTaskFolders.findIndex(
          (f) => !f.parentId || taskFolderIdMap.has(f.parentId),
        );
        if (idx === -1) break;
        const folder = pendingTaskFolders.splice(idx, 1)[0];
        const created = await tx.taskFolder.create({
          data: {
            projectId: newProject.id,
            name: folder.name,
            parentId: folder.parentId ? taskFolderIdMap.get(folder.parentId) : null,
          },
        });
        taskFolderIdMap.set(folder.id, created.id);
      }

      // Tarefas de topo + subtarefas
      const tasks = await tx.task.findMany({
        where: { projectId: sourceProjectId, parentTaskId: null },
        orderBy: [{ status: "asc" }, { position: "asc" }],
      });
      for (const task of tasks) {
        const project = await tx.project.update({
          where: { id: newProject.id },
          data: { taskSeq: { increment: 1 } },
        });
        const newTask = await tx.task.create({
          data: {
            projectId: newProject.id,
            number: project.taskSeq,
            folderId: task.folderId ? taskFolderIdMap.get(task.folderId) : null,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            position: task.position,
            deadline: task.deadline,
            createdById: userId,
          },
        });

        const subtasks = await tx.task.findMany({
          where: { parentTaskId: task.id },
          orderBy: { createdAt: "asc" },
        });
        for (const subtask of subtasks) {
          const subtaskProject = await tx.project.update({
            where: { id: newProject.id },
            data: { taskSeq: { increment: 1 } },
          });
          await tx.task.create({
            data: {
              projectId: newProject.id,
              number: subtaskProject.taskSeq,
              title: subtask.title,
              priority: subtask.priority,
              status: subtask.status,
              parentTaskId: newTask.id,
              createdById: userId,
            },
          });
        }
      }

      // Pastas de notas + notas (com historico de versoes)
      const noteFolders = await tx.noteFolder.findMany({ where: { projectId: sourceProjectId } });
      const noteFolderIdMap = new Map<string, string>();
      const pendingNoteFolders = [...noteFolders];
      while (pendingNoteFolders.length > 0) {
        const idx = pendingNoteFolders.findIndex(
          (f) => !f.parentId || noteFolderIdMap.has(f.parentId),
        );
        if (idx === -1) break;
        const folder = pendingNoteFolders.splice(idx, 1)[0];
        const created = await tx.noteFolder.create({
          data: {
            projectId: newProject.id,
            name: folder.name,
            parentId: folder.parentId ? noteFolderIdMap.get(folder.parentId) : null,
          },
        });
        noteFolderIdMap.set(folder.id, created.id);
      }

      const notes = await tx.note.findMany({ where: { projectId: sourceProjectId } });
      for (const note of notes) {
        const versions = await tx.noteVersion.findMany({
          where: { noteId: note.id },
          orderBy: { createdAt: "asc" },
        });
        await tx.note.create({
          data: {
            projectId: newProject.id,
            folderId: note.folderId ? noteFolderIdMap.get(note.folderId) : null,
            title: note.title,
            content: note.content,
            isPinned: note.isPinned,
            isResolved: note.isResolved,
            createdById: userId,
            versions: versions.length
              ? {
                  create: versions.map((version) => ({
                    title: version.title,
                    content: version.content,
                    editedById: userId,
                    createdAt: version.createdAt,
                  })),
                }
              : undefined,
          },
        });
      }

      // Regras
      const rules = await tx.rule.findMany({ where: { projectId: sourceProjectId } });
      if (rules.length > 0) {
        await tx.rule.createMany({
          data: rules.map((rule) => ({
            projectId: newProject.id,
            title: rule.title,
            content: rule.content,
            createdById: userId,
          })),
        });
      }

      // Rotas da aplicacao
      const routes = await tx.appRoute.findMany({ where: { projectId: sourceProjectId } });
      if (routes.length > 0) {
        await tx.appRoute.createMany({
          data: routes.map((route) => ({
            projectId: newProject.id,
            description: route.description,
            link: route.link,
            notes: route.notes,
            createdById: userId,
          })),
        });
      }

      // Credenciais (ciphertext copiado tal e qual, sem re-encriptar)
      const credentials = await tx.credential.findMany({ where: { projectId: sourceProjectId } });
      if (credentials.length > 0) {
        await tx.credential.createMany({
          data: credentials.map((credential) => ({
            projectId: newProject.id,
            serviceName: credential.serviceName,
            url: credential.url,
            username: credential.username,
            passwordCiphertext: credential.passwordCiphertext,
            passwordIv: credential.passwordIv,
            passwordAuthTag: credential.passwordAuthTag,
            notesCiphertext: credential.notesCiphertext,
            notesIv: credential.notesIv,
            notesAuthTag: credential.notesAuthTag,
            cost: credential.cost,
            billingCycle: credential.billingCycle,
            createdById: userId,
          })),
        });
      }

      // Bugs + labels associadas
      const bugs = await tx.bug.findMany({
        where: { projectId: sourceProjectId },
        orderBy: { createdAt: "asc" },
        include: { labels: true },
      });
      for (const bug of bugs) {
        const bugProject = await tx.project.update({
          where: { id: newProject.id },
          data: { bugSeq: { increment: 1 } },
        });
        const newBug = await tx.bug.create({
          data: {
            projectId: newProject.id,
            number: bugProject.bugSeq,
            title: bug.title,
            description: bug.description,
            priority: bug.priority,
            status: bug.status,
            reporterId: userId,
          },
        });
        const mappedLabelIds = bug.labels
          .map((bugLabel) => labelIdMap.get(bugLabel.labelId))
          .filter((id): id is string => !!id);
        if (mappedLabelIds.length > 0) {
          await tx.bugLabel.createMany({
            data: mappedLabelIds.map((labelId) => ({ bugId: newBug.id, labelId })),
          });
        }
      }

      return newProject.id;
    },
    { timeout: 30000, maxWait: 10000 },
  );

  await logActivity({
    projectId: newProjectId,
    userId,
    action: "projeto.duplicado",
    entityType: "project",
    entityId: newProjectId,
    metadata: { fromProjectId: sourceProjectId, fromProjectName: sourceProject.name },
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${newProjectId}`);
}

export async function updateProjectAction(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN]);

  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  revalidatePath(`/projetos/${projectId}`);
  revalidatePath(`/projetos/${projectId}/definicoes`);
  return {};
}

export async function setProjectArchivedAction(projectId: string, archived: boolean) {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN]);

  await prisma.project.update({ where: { id: projectId }, data: { archived } });

  await logActivity({
    projectId,
    userId,
    action: archived ? "projeto.arquivado" : "projeto.reativado",
    entityType: "project",
    entityId: projectId,
  });

  revalidatePath("/projetos");
  revalidatePath(`/projetos/${projectId}`);
}

export async function deleteProjectAction(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN]);

  const isOwner = await isCurrentUserOwner();
  if (!canDeleteOwnRecord({ isOwner, creatorId: project.createdById, userId })) {
    throw new Error("Só podes apagar projetos que tu próprio criaste.");
  }

  // Bugs, tarefas, notas, credenciais e restantes registos ligados ao projeto
  // sao apagados em cascata pela BD (onDelete: Cascade no schema).
  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projetos");
  redirect("/projetos");
}

export async function addMemberAction(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN]);

  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [targetUser, inviter, project] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.email } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
  ]);
  const inviterName = inviter.name ?? inviter.email ?? "Um admin";

  // Ainda nao tem conta: cria-se um convite. A pessoa e adicionada
  // automaticamente ao projeto assim que se registar (ou fizer login com
  // GitHub) com este email.
  if (!targetUser) {
    const existingInvite = await prisma.projectInvite.findUnique({
      where: { projectId_email: { projectId, email: parsed.data.email } },
    });
    if (existingInvite) {
      return { error: "Já existe um convite pendente para este email." };
    }

    await prisma.projectInvite.create({
      data: {
        projectId,
        email: parsed.data.email,
        role: parsed.data.role,
        invitedById: userId,
      },
    });

    try {
      await sendProjectInviteEmail({
        to: parsed.data.email,
        projectName: project.name,
        inviterName,
        role: parsed.data.role,
        hasAccount: false,
      });
    } catch (error) {
      console.error("Falha ao enviar email de convite:", error);
    }

    revalidatePath(`/projetos/${projectId}/definicoes`);
    return {};
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUser.id } },
  });
  if (existing) {
    return { error: "Este utilizador já é membro do projeto." };
  }

  await prisma.projectMember.create({
    data: { projectId, userId: targetUser.id, role: parsed.data.role },
  });

  await prisma.notification.create({
    data: {
      userId: targetUser.id,
      type: NotificationType.MEMBRO_ADICIONADO,
      title: `Foste adicionado ao projeto "${project.name}"`,
      link: `/projetos/${projectId}`,
    },
  });

  try {
    await sendProjectInviteEmail({
      to: parsed.data.email,
      projectName: project.name,
      inviterName,
      role: parsed.data.role,
      hasAccount: true,
    });
  } catch (error) {
    console.error("Falha ao enviar email de convite:", error);
  }

  await logActivity({
    projectId,
    userId,
    action: "membro.adicionado",
    entityType: "project_member",
    entityId: targetUser.id,
    metadata: { role: parsed.data.role, email: targetUser.email },
  });

  revalidatePath(`/projetos/${projectId}/definicoes`);
  return {};
}

export async function cancelInviteAction(inviteId: string) {
  const invite = await prisma.projectInvite.findUniqueOrThrow({ where: { id: inviteId } });
  const userId = await requireUserId();
  await requireProjectRole(userId, invite.projectId, [ProjectRole.ADMIN]);

  await prisma.projectInvite.delete({ where: { id: inviteId } });

  revalidatePath(`/projetos/${invite.projectId}/definicoes`);
}

export async function removeMemberAction(projectId: string, targetUserId: string) {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN]);

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (project.createdById === targetUserId) {
    throw new Error("Não podes remover o criador do projeto.");
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });

  revalidatePath(`/projetos/${projectId}/definicoes`);
}

export async function toggleProjectPinAction(projectId: string) {
  const userId = await requireUserId();
  const membership = await requireProjectMembership(userId, projectId);

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { pinned: !membership.pinned },
  });

  revalidatePath("/", "layout");
}

export async function updateMemberRoleAction(
  projectId: string,
  targetUserId: string,
  role: ProjectRole,
) {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN]);

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
  });

  revalidatePath(`/projetos/${projectId}/definicoes`);
}
