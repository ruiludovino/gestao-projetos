"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logActivity } from "@/lib/activity";
import {
  requireProjectMembership,
  canViewCredentials,
  isCurrentUserOwner,
  canDeleteOwnRecord,
} from "@/lib/permissions";
import { sendAssignmentEmail } from "@/lib/email";
import {
  createCredentialSchema,
  updateCredentialSchema,
  credentialCategorySchema,
} from "@/lib/validations/credential";

const NO_ASSIGNEE = "__unassigned__";
const NO_BILLING_CYCLE = "__none__";
const NO_CATEGORY = "__none__";

function normalizeAssigneeId(value: FormDataEntryValue | null): string {
  if (!value || value === NO_ASSIGNEE) return "";
  return String(value);
}

function normalizeBillingCycle(value: FormDataEntryValue | null): string {
  if (!value || value === NO_BILLING_CYCLE) return "";
  return String(value);
}

function normalizeCategoryId(value: FormDataEntryValue | null): string {
  if (!value || value === NO_CATEGORY) return "";
  return String(value);
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

async function requireCredentialsAccess(projectId: string) {
  const userId = await requireUserId();
  const membership = await requireProjectMembership(userId, projectId);
  if (!canViewCredentials(membership.role)) {
    throw new Error("Não tens permissão para aceder ao cofre de credenciais deste projeto.");
  }
  return { userId, membership };
}

async function notifyCredentialAssignee({
  serviceName,
  projectId,
  assigneeId,
  actorId,
}: {
  serviceName: string;
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
      type: NotificationType.CREDENCIAL_ATRIBUIDA,
      title: `Foste indicado como responsável pela credencial "${serviceName}"`,
      link: `/projetos/${projectId}/credenciais`,
    },
  });

  if (assignee?.email) {
    try {
      await sendAssignmentEmail({
        to: assignee.email,
        assignerName: actor?.name ?? actor?.email ?? "Um colega",
        entityLabel: "a credencial",
        entityTitle: serviceName,
        link: `/projetos/${projectId}/credenciais`,
      });
    } catch (error) {
      console.error("Falha ao enviar email de atribuição de credencial:", error);
    }
  }
}

async function requireCategoryInProject(categoryId: string, projectId: string) {
  const category = await prisma.credentialCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.projectId !== projectId) {
    throw new Error("Categoria inválida para este projeto.");
  }
  return category;
}

export type CredentialFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createCredentialAction(
  projectId: string,
  _prevState: CredentialFormState,
  formData: FormData,
): Promise<CredentialFormState> {
  const { userId } = await requireCredentialsAccess(projectId);

  const parsed = createCredentialSchema.safeParse({
    serviceName: formData.get("serviceName"),
    url: formData.get("url"),
    username: formData.get("username"),
    password: formData.get("password"),
    notes: formData.get("notes"),
    assigneeId: normalizeAssigneeId(formData.get("assigneeId")),
    categoryId: normalizeCategoryId(formData.get("categoryId")),
    cost: formData.get("cost"),
    billingCycle: normalizeBillingCycle(formData.get("billingCycle")),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceName, url, username, password, notes, assigneeId, categoryId, cost, billingCycle } =
    parsed.data;
  const passwordEnc = encrypt(password);
  const notesEnc = notes ? encrypt(notes) : null;

  if (categoryId) {
    await requireCategoryInProject(categoryId, projectId);
  }

  const credential = await prisma.credential.create({
    data: {
      projectId,
      serviceName,
      url: url || null,
      username: username || null,
      passwordCiphertext: passwordEnc.ciphertext,
      passwordIv: passwordEnc.iv,
      passwordAuthTag: passwordEnc.authTag,
      notesCiphertext: notesEnc?.ciphertext ?? null,
      notesIv: notesEnc?.iv ?? null,
      notesAuthTag: notesEnc?.authTag ?? null,
      assigneeId: assigneeId || userId,
      categoryId: categoryId || null,
      cost: cost ? Number(cost) : null,
      billingCycle: billingCycle || null,
      createdById: userId,
    },
  });

  await logActivity({
    projectId,
    userId,
    action: "credencial.criada",
    entityType: "credential",
    entityId: credential.id,
    metadata: { serviceName },
  });

  if (credential.assigneeId && credential.assigneeId !== userId) {
    await notifyCredentialAssignee({
      serviceName: credential.serviceName,
      projectId,
      assigneeId: credential.assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${projectId}/credenciais`);
  redirect(`/projetos/${projectId}/credenciais`);
}

export async function updateCredentialAction(
  credentialId: string,
  _prevState: CredentialFormState,
  formData: FormData,
): Promise<CredentialFormState> {
  const credential = await prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
  const { userId } = await requireCredentialsAccess(credential.projectId);

  const parsed = updateCredentialSchema.safeParse({
    serviceName: formData.get("serviceName"),
    url: formData.get("url"),
    username: formData.get("username"),
    password: formData.get("password"),
    notes: formData.get("notes"),
    assigneeId: normalizeAssigneeId(formData.get("assigneeId")),
    categoryId: normalizeCategoryId(formData.get("categoryId")),
    cost: formData.get("cost"),
    billingCycle: normalizeBillingCycle(formData.get("billingCycle")),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceName, url, username, password, notes, assigneeId, categoryId, cost, billingCycle } =
    parsed.data;
  const notesEnc = notes ? encrypt(notes) : null;
  const nextAssigneeId = assigneeId || null;

  if (nextAssigneeId) {
    await requireProjectMembership(nextAssigneeId, credential.projectId);
  }
  if (categoryId) {
    await requireCategoryInProject(categoryId, credential.projectId);
  }

  await prisma.credential.update({
    where: { id: credentialId },
    data: {
      serviceName,
      url: url || null,
      username: username || null,
      notesCiphertext: notesEnc?.ciphertext ?? null,
      notesIv: notesEnc?.iv ?? null,
      notesAuthTag: notesEnc?.authTag ?? null,
      assigneeId: nextAssigneeId,
      categoryId: categoryId || null,
      cost: cost ? Number(cost) : null,
      billingCycle: billingCycle || null,
      ...(password
        ? (() => {
            const enc = encrypt(password);
            return {
              passwordCiphertext: enc.ciphertext,
              passwordIv: enc.iv,
              passwordAuthTag: enc.authTag,
            };
          })()
        : {}),
    },
  });

  if (
    nextAssigneeId &&
    nextAssigneeId !== credential.assigneeId &&
    nextAssigneeId !== userId
  ) {
    await notifyCredentialAssignee({
      serviceName,
      projectId: credential.projectId,
      assigneeId: nextAssigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${credential.projectId}/credenciais`);
  return {};
}

export async function deleteCredentialAction(credentialId: string) {
  const credential = await prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
  const { userId } = await requireCredentialsAccess(credential.projectId);
  const isOwner = await isCurrentUserOwner();
  if (!canDeleteOwnRecord({ isOwner, creatorId: credential.createdById, userId })) {
    throw new Error("Só podes apagar credenciais que tu próprio criaste.");
  }

  await prisma.credential.delete({ where: { id: credentialId } });

  await logActivity({
    projectId: credential.projectId,
    userId,
    action: "credencial.removida",
    entityType: "credential",
    entityId: credentialId,
    metadata: { serviceName: credential.serviceName },
  });

  revalidatePath(`/projetos/${credential.projectId}/credenciais`);
}

export async function copyCredentialToProjectAction(credentialId: string, targetProjectId: string) {
  const credential = await prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
  await requireCredentialsAccess(credential.projectId);
  const { userId } = await requireCredentialsAccess(targetProjectId);

  const newCredential = await prisma.credential.create({
    data: {
      projectId: targetProjectId,
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
    },
  });

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "credencial.copiada",
    entityType: "credential",
    entityId: newCredential.id,
    metadata: {
      serviceName: newCredential.serviceName,
      fromProjectId: credential.projectId,
      fromCredentialId: credential.id,
    },
  });

  revalidatePath(`/projetos/${targetProjectId}/credenciais`);
  return { id: newCredential.id };
}

export async function copyAllCredentialsToProjectAction(projectId: string, targetProjectId: string) {
  const { userId } = await requireCredentialsAccess(projectId);
  await requireCredentialsAccess(targetProjectId);

  const credentials = await prisma.credential.findMany({ where: { projectId } });
  if (credentials.length === 0) return { copied: 0 };

  await prisma.credential.createMany({
    data: credentials.map((credential) => ({
      projectId: targetProjectId,
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

  await logActivity({
    projectId: targetProjectId,
    userId,
    action: "credenciais.copiadas_em_lote",
    entityType: "credential",
    entityId: targetProjectId,
    metadata: { count: credentials.length, fromProjectId: projectId },
  });

  revalidatePath(`/projetos/${targetProjectId}/credenciais`);
  return { copied: credentials.length };
}

export async function revealCredentialAction(credentialId: string) {
  const credential = await prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
  const { userId } = await requireCredentialsAccess(credential.projectId);

  const password = decrypt({
    ciphertext: credential.passwordCiphertext,
    iv: credential.passwordIv,
    authTag: credential.passwordAuthTag,
  });

  const notes =
    credential.notesCiphertext && credential.notesIv && credential.notesAuthTag
      ? decrypt({
          ciphertext: credential.notesCiphertext,
          iv: credential.notesIv,
          authTag: credential.notesAuthTag,
        })
      : null;

  await logActivity({
    projectId: credential.projectId,
    userId,
    action: "credencial.acedida",
    entityType: "credential",
    entityId: credentialId,
    metadata: { serviceName: credential.serviceName },
  });

  return { password, notes, username: credential.username };
}

export type CredentialCategoryOption = { id: string; name: string; color: string };

export async function createCredentialCategoryAction(
  projectId: string,
  name: string,
  color: string,
): Promise<CredentialCategoryOption> {
  await requireCredentialsAccess(projectId);

  const parsed = credentialCategorySchema.safeParse({ name, color });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const existing = await prisma.credentialCategory.findUnique({
    where: { projectId_name: { projectId, name: parsed.data.name } },
  });
  if (existing) {
    throw new Error("Já existe uma categoria com este nome.");
  }

  const category = await prisma.credentialCategory.create({
    data: { projectId, ...parsed.data },
  });

  revalidatePath(`/projetos/${projectId}/credenciais`);
  revalidatePath(`/projetos/${projectId}/credenciais/novo`);
  return { id: category.id, name: category.name, color: category.color };
}

export async function renameCredentialCategoryAction(
  categoryId: string,
  name: string,
  color: string,
): Promise<CredentialCategoryOption> {
  const category = await prisma.credentialCategory.findUniqueOrThrow({ where: { id: categoryId } });
  await requireCredentialsAccess(category.projectId);

  const parsed = credentialCategorySchema.safeParse({ name, color });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const duplicate = await prisma.credentialCategory.findUnique({
    where: { projectId_name: { projectId: category.projectId, name: parsed.data.name } },
  });
  if (duplicate && duplicate.id !== categoryId) {
    throw new Error("Já existe uma categoria com este nome.");
  }

  const updated = await prisma.credentialCategory.update({
    where: { id: categoryId },
    data: parsed.data,
  });

  revalidatePath(`/projetos/${category.projectId}/credenciais`);
  revalidatePath(`/projetos/${category.projectId}/credenciais/novo`);
  return { id: updated.id, name: updated.name, color: updated.color };
}

export async function deleteCredentialCategoryAction(categoryId: string) {
  const category = await prisma.credentialCategory.findUniqueOrThrow({ where: { id: categoryId } });
  await requireCredentialsAccess(category.projectId);

  await prisma.credentialCategory.delete({ where: { id: categoryId } });

  revalidatePath(`/projetos/${category.projectId}/credenciais`);
  revalidatePath(`/projetos/${category.projectId}/credenciais/novo`);
}
