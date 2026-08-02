"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { ProjectRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  requireProjectMembership,
  requireProjectRole,
  canEditContent,
  isCurrentUserOwner,
  canDeleteOwnRecord,
} from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { createAppRouteSchema, updateAppRouteSchema } from "@/lib/validations/app-route";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

export type AppRouteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createAppRouteAction(
  projectId: string,
  _prevState: AppRouteFormState,
  formData: FormData,
): Promise<AppRouteFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const parsed = createAppRouteSchema.safeParse({
    description: formData.get("description"),
    link: formData.get("link"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.appRoute.create({
    data: {
      projectId,
      description: parsed.data.description,
      link: parsed.data.link,
      notes: parsed.data.notes || null,
      createdById: userId,
    },
  });

  revalidatePath(`/projetos/${projectId}/rotas`);
  redirect(`/projetos/${projectId}/rotas`);
}

export async function updateAppRouteAction(
  routeId: string,
  _prevState: AppRouteFormState,
  formData: FormData,
): Promise<AppRouteFormState> {
  const route = await prisma.appRoute.findUnique({ where: { id: routeId } });
  if (!route) notFound();
  const userId = await requireUserId();
  const membership = await requireProjectMembership(userId, route.projectId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar rotas." };
  }

  const parsed = updateAppRouteSchema.safeParse({
    description: formData.get("description"),
    link: formData.get("link"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.appRoute.update({
    where: { id: routeId },
    data: {
      description: parsed.data.description,
      link: parsed.data.link,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/projetos/${route.projectId}/rotas`);
  return {};
}

export async function copyAppRouteToProjectAction(routeId: string, targetProjectId: string) {
  const route = await prisma.appRoute.findUnique({ where: { id: routeId } });
  if (!route) notFound();
  const userId = await requireUserId();
  await requireProjectMembership(userId, route.projectId);
  await requireProjectRole(userId, targetProjectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const newRoute = await prisma.appRoute.create({
    data: {
      projectId: targetProjectId,
      description: route.description,
      link: route.link,
      notes: route.notes,
      createdById: userId,
    },
  });

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "rota.copiada",
    entityType: "appRoute",
    entityId: newRoute.id,
    metadata: { description: newRoute.description, fromProjectId: route.projectId, fromRouteId: route.id },
  });

  revalidatePath(`/projetos/${targetProjectId}/rotas`);
  return { id: newRoute.id };
}

export async function copyAllAppRoutesToProjectAction(projectId: string, targetProjectId: string) {
  const userId = await requireUserId();
  await requireProjectMembership(userId, projectId);
  await requireProjectRole(userId, targetProjectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const routes = await prisma.appRoute.findMany({ where: { projectId } });
  if (routes.length === 0) return { copied: 0 };

  await prisma.appRoute.createMany({
    data: routes.map((route) => ({
      projectId: targetProjectId,
      description: route.description,
      link: route.link,
      notes: route.notes,
      createdById: userId,
    })),
  });

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "rotas.copiadas_em_lote",
    entityType: "appRoute",
    entityId: targetProjectId,
    metadata: { count: routes.length, fromProjectId: projectId },
  });

  revalidatePath(`/projetos/${targetProjectId}/rotas`);
  return { copied: routes.length };
}

export async function deleteAppRouteAction(routeId: string) {
  const route = await prisma.appRoute.findUnique({ where: { id: routeId } });
  if (!route) notFound();
  const userId = await requireUserId();
  await requireProjectMembership(userId, route.projectId);
  const isOwner = await isCurrentUserOwner();
  if (!canDeleteOwnRecord({ isOwner, creatorId: route.createdById, userId })) {
    throw new Error("Só podes apagar rotas que tu próprio criaste.");
  }

  await prisma.appRoute.delete({ where: { id: routeId } });

  revalidatePath(`/projetos/${route.projectId}/rotas`);
}
