"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationType, ProjectRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireProjectMembership, requireProjectRole, canEditContent } from "@/lib/permissions";
import { sendAssignmentEmail } from "@/lib/email";
import { createFolderSchema, createNoteSchema, updateNoteSchema } from "@/lib/validations/note";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

async function requireNoteAccess(noteId: string) {
  const userId = await requireUserId();
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  const membership = await requireProjectMembership(userId, note.projectId);
  return { userId, note, membership };
}

async function notifyNoteAssignee({
  noteId,
  noteTitle,
  projectId,
  assigneeId,
  actorId,
}: {
  noteId: string;
  noteTitle: string;
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
      type: NotificationType.NOTA_ATRIBUIDA,
      title: `Foste indicado como responsável pela nota "${noteTitle}"`,
      link: `/projetos/${projectId}/notas/${noteId}`,
    },
  });

  if (assignee?.email) {
    try {
      await sendAssignmentEmail({
        to: assignee.email,
        assignerName: actor?.name ?? actor?.email ?? "Um colega",
        entityLabel: "a nota",
        entityTitle: noteTitle,
        link: `/projetos/${projectId}/notas/${noteId}`,
      });
    } catch (error) {
      console.error("Falha ao enviar email de atribuição de nota:", error);
    }
  }
}

export type NoteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createFolderAction(
  projectId: string,
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const parentId = formData.get("parentId");
  const parsed = createFolderSchema.safeParse({
    name: formData.get("name"),
    parentId: parentId ? String(parentId) : "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.noteFolder.create({
    data: {
      projectId,
      name: parsed.data.name,
      parentId: parsed.data.parentId || null,
    },
  });

  revalidatePath(`/projetos/${projectId}/notas`);
  return {};
}

export async function deleteFolderAction(folderId: string) {
  const folder = await prisma.noteFolder.findUniqueOrThrow({ where: { id: folderId } });
  const userId = await requireUserId();
  await requireProjectRole(userId, folder.projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  await prisma.noteFolder.delete({ where: { id: folderId } });

  revalidatePath(`/projetos/${folder.projectId}/notas`);
}

export async function createNoteAction(
  projectId: string,
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const userId = await requireUserId();
  await requireProjectRole(userId, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  const folderId = formData.get("folderId");
  const assigneeId = formData.get("assigneeId");
  const parsed = createNoteSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    folderId: folderId && folderId !== "__none__" ? String(folderId) : "",
    assigneeId: assigneeId ? String(assigneeId) : "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const note = await prisma.note.create({
    data: {
      projectId,
      title: parsed.data.title,
      content: parsed.data.content || "",
      folderId: parsed.data.folderId || null,
      assigneeId: parsed.data.assigneeId || null,
      createdById: userId,
    },
  });

  await logActivity({
    projectId,
    userId,
    action: "nota.criada",
    entityType: "note",
    entityId: note.id,
    metadata: { title: note.title },
  });

  if (note.assigneeId && note.assigneeId !== userId) {
    await notifyNoteAssignee({
      noteId: note.id,
      noteTitle: note.title,
      projectId,
      assigneeId: note.assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${projectId}/notas`);
  redirect(`/projetos/${projectId}/notas/${note.id}`);
}

export async function updateNoteAction(
  noteId: string,
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const { note, userId, membership } = await requireNoteAccess(noteId);
  if (!canEditContent(membership.role)) {
    return { error: "Não tens permissão para editar esta nota." };
  }

  const parsed = updateNoteSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // guarda a versao anterior antes de sobrescrever
  await prisma.noteVersion.create({
    data: {
      noteId,
      title: note.title,
      content: note.content,
      editedById: userId,
    },
  });

  await prisma.note.update({
    where: { id: noteId },
    data: { title: parsed.data.title, content: parsed.data.content || "" },
  });

  revalidatePath(`/projetos/${note.projectId}/notas/${noteId}`);
  revalidatePath(`/projetos/${note.projectId}/notas`);
  return {};
}

export async function deleteNoteAction(noteId: string) {
  const { note, membership } = await requireNoteAccess(noteId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para remover esta nota.");
  }

  await prisma.note.delete({ where: { id: noteId } });

  revalidatePath(`/projetos/${note.projectId}/notas`);
  redirect(`/projetos/${note.projectId}/notas`);
}

export async function togglePinNoteAction(noteId: string) {
  const { note, membership } = await requireNoteAccess(noteId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta nota.");
  }

  await prisma.note.update({ where: { id: noteId }, data: { isPinned: !note.isPinned } });

  revalidatePath(`/projetos/${note.projectId}/notas`);
  revalidatePath(`/projetos/${note.projectId}/notas/${noteId}`);
}

export async function updateNoteAssigneeAction(noteId: string, assigneeId: string | null) {
  const { note, userId, membership } = await requireNoteAccess(noteId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta nota.");
  }

  if (assigneeId) {
    await requireProjectMembership(assigneeId, note.projectId);
  }

  await prisma.note.update({ where: { id: noteId }, data: { assigneeId } });

  await logActivity({
    projectId: note.projectId,
    userId,
    action: "nota.atribuida",
    entityType: "note",
    entityId: noteId,
    metadata: { assigneeId },
  });

  if (assigneeId && assigneeId !== userId) {
    await notifyNoteAssignee({
      noteId,
      noteTitle: note.title,
      projectId: note.projectId,
      assigneeId,
      actorId: userId,
    });
  }

  revalidatePath(`/projetos/${note.projectId}/notas/${noteId}`);
  revalidatePath(`/projetos/${note.projectId}/notas`);
}

export async function moveNoteToFolderAction(noteId: string, folderId: string | null) {
  const { note, membership } = await requireNoteAccess(noteId);
  if (!canEditContent(membership.role)) {
    throw new Error("Não tens permissão para editar esta nota.");
  }

  await prisma.note.update({ where: { id: noteId }, data: { folderId } });

  revalidatePath(`/projetos/${note.projectId}/notas`);
  revalidatePath(`/projetos/${note.projectId}/notas/${noteId}`);
}
