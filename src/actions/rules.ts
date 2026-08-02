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
import { createRuleSchema, updateRuleSchema } from "@/lib/validations/rule";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

async function requireRuleAccess(ruleId: string) {
  const userId = await requireUserId();
  const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!rule) notFound();
  const membership = await requireProjectMembership(userId, rule.projectId);
  return { userId, rule, membership };
}

export type RuleFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createRuleAction(
  projectId: string,
  _prevState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const parsed = createRuleSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.rule.create({
    data: {
      projectId,
      title: parsed.data.title,
      content: parsed.data.content || "",
      createdById: userId,
    },
  });

  revalidatePath(`/projetos/${projectId}/regras`);
  redirect(`/projetos/${projectId}/regras`);
}

export async function updateRuleAction(
  ruleId: string,
  _prevState: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const { rule, membership } = await requireRuleAccess(ruleId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar regras." };
  }

  const parsed = updateRuleSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.rule.update({
    where: { id: ruleId },
    data: { title: parsed.data.title, content: parsed.data.content || "" },
  });

  revalidatePath(`/projetos/${rule.projectId}/regras/${ruleId}`);
  revalidatePath(`/projetos/${rule.projectId}/regras`);
  return {};
}

export async function copyRuleToProjectAction(ruleId: string, targetProjectId: string) {
  const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!rule) notFound();
  const userId = await requireUserId();
  await requireProjectMembership(userId, rule.projectId);
  await requireProjectRole(userId, targetProjectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const newRule = await prisma.rule.create({
    data: {
      projectId: targetProjectId,
      title: rule.title,
      content: rule.content,
      createdById: userId,
    },
  });

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "regra.copiada",
    entityType: "rule",
    entityId: newRule.id,
    metadata: { title: newRule.title, fromProjectId: rule.projectId, fromRuleId: rule.id },
  });

  revalidatePath(`/projetos/${targetProjectId}/regras`);
  return { id: newRule.id };
}

export async function copyAllRulesToProjectAction(projectId: string, targetProjectId: string) {
  const userId = await requireUserId();
  await requireProjectMembership(userId, projectId);
  await requireProjectRole(userId, targetProjectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const rules = await prisma.rule.findMany({ where: { projectId } });
  if (rules.length === 0) return { copied: 0 };

  await prisma.rule.createMany({
    data: rules.map((rule) => ({
      projectId: targetProjectId,
      title: rule.title,
      content: rule.content,
      createdById: userId,
    })),
  });

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "regras.copiadas_em_lote",
    entityType: "rule",
    entityId: targetProjectId,
    metadata: { count: rules.length, fromProjectId: projectId },
  });

  revalidatePath(`/projetos/${targetProjectId}/regras`);
  return { copied: rules.length };
}

export async function deleteRuleAction(ruleId: string) {
  const { rule, userId } = await requireRuleAccess(ruleId);
  const isOwner = await isCurrentUserOwner();
  if (!canDeleteOwnRecord({ isOwner, creatorId: rule.createdById, userId })) {
    throw new Error("Só podes apagar regras que tu próprio criaste.");
  }

  await prisma.rule.delete({ where: { id: ruleId } });

  revalidatePath(`/projetos/${rule.projectId}/regras`);
  redirect(`/projetos/${rule.projectId}/regras`);
}
