"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { logActivity } from "@/lib/activity";
import { requireProjectMembership, canViewCredentials } from "@/lib/permissions";
import { createCredentialSchema, updateCredentialSchema } from "@/lib/validations/credential";

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
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceName, url, username, password, notes } = parsed.data;
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

  revalidatePath(`/projetos/${projectId}/credenciais`);
  redirect(`/projetos/${projectId}/credenciais`);
}

export async function updateCredentialAction(
  credentialId: string,
  _prevState: CredentialFormState,
  formData: FormData,
): Promise<CredentialFormState> {
  const credential = await prisma.credential.findUniqueOrThrow({ where: { id: credentialId } });
  await requireCredentialsAccess(credential.projectId);

  const parsed = updateCredentialSchema.safeParse({
    serviceName: formData.get("serviceName"),
    url: formData.get("url"),
    username: formData.get("username"),
    password: formData.get("password"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceName, url, username, password, notes } = parsed.data;
  const notesEnc = notes ? encrypt(notes) : null;

  await prisma.credential.update({
    where: { id: credentialId },
    data: {
      serviceName,
      url: url || null,
      username: username || null,
      notesCiphertext: notesEnc?.ciphertext ?? null,
      notesIv: notesEnc?.iv ?? null,
      notesAuthTag: notesEnc?.authTag ?? null,
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
