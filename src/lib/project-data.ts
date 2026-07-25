import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

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
