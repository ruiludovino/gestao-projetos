"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NotificationType, ProjectRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { logActivity } from "@/lib/activity";
import { requireProjectRole } from "@/lib/permissions";
import { sendProjectInviteEmail } from "@/lib/email";
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
  const userId = await requireUserId();

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
