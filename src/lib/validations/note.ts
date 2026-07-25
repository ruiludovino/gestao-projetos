import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(80),
  parentId: z.string().optional().or(z.literal("")),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
  content: z.string().max(50000).optional().or(z.literal("")),
  folderId: z.string().optional().or(z.literal("")),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional().or(z.literal("")),
});
