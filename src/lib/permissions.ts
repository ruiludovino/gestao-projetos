import "server-only";

import { ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class ForbiddenError extends Error {
  constructor(message = "Não tens permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function requireProjectMembership(userId: string, projectId: string) {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) {
    throw new ForbiddenError("Não és membro deste projeto.");
  }
  return membership;
}

export async function requireProjectRole(
  userId: string,
  projectId: string,
  allowed: ProjectRole[],
) {
  const membership = await requireProjectMembership(userId, projectId);
  if (!allowed.includes(membership.role)) {
    throw new ForbiddenError();
  }
  return membership;
}

// Apenas ADMIN gere membros, credenciais globais do projeto e definicoes/arquivamento.
export const canManageProject = (role: ProjectRole) => role === ProjectRole.ADMIN;

// VIEWER nunca ve passwords do cofre, so ADMIN/DEVELOPER.
export const canViewCredentials = (role: ProjectRole) =>
  role === ProjectRole.ADMIN || role === ProjectRole.DEVELOPER;

// VIEWER e so leitura em bugs/tarefas/notas.
export const canEditContent = (role: ProjectRole) =>
  role === ProjectRole.ADMIN || role === ProjectRole.DEVELOPER;
