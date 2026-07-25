"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { NotificationType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logActivity } from "@/lib/activity";
import { requireProjectMembership, canViewCredentials } from "@/lib/permissions";
import { sendAssignmentEmail } from "@/lib/email";
import { createCredentialSchema, updateCredentialSchema } from "@/lib/validations/credential";

const NO_ASSIGNEE = "__unassigned__";

function normalizeAssigneeId(value: FormDataEntryValue | null): string {
  if (!value || value === NO_ASSIGNEE) return "";
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
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceName, url, username, password, notes, assigneeId } = parsed.data;
  const passwordEnc = encrypt(password);
  const notesEnc = notes ? encrypt(notes) : null;

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
      assigneeId: assigneeId || null,
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
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceName, url, username, password, notes, assigneeId } = parsed.data;
  const notesEnc = notes ? encrypt(notes) : null;
  const nextAssigneeId = assigneeId || null;

  if (nextAssigneeId) {
    await requireProjectMembership(nextAssigneeId, credential.projectId);
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
