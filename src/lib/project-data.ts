import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { ProjectRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const getProject = cache(async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();
  return project;
});

export const getMembership = cache(async (projectId: string, userId: string) => {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) notFound();
  return membership;
});

// Projetos para onde o utilizador pode copiar bugs/tarefas/notas/credenciais:
// exclui o projeto atual e requer role com permissao para criar conteudo.
export async function getCopyTargetProjects(
  userId: string,
  currentProjectId: string,
  allowedRoles: ProjectRole[] = [ProjectRole.ADMIN, ProjectRole.DEVELOPER],
) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, role: { in: allowedRoles }, projectId: { not: currentProjectId } },
    include: { project: { select: { id: true, name: true, archived: true } } },
  });

  return memberships
    .map((m) => m.project)
    .filter((project) => !project.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}
