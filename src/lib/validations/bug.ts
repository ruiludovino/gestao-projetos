import { z } from "zod";
import { BugStatus, Priority } from "@prisma/client";

export const createBugSchema = z.object({
  title: z.string().min(2, "O título tem de ter pelo menos 2 caracteres").max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
  priority: z.nativeEnum(Priority),
  assigneeId: z.string().optional().or(z.literal("")),
  labelIds: z.array(z.string()).optional(),
});

export const updateBugSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
});

export const bugStatusSchema = z.nativeEnum(BugStatus);
export const prioritySchema = z.nativeEnum(Priority);

export const commentSchema = z.object({
  body: z.string().min(1, "O comentário não pode estar vazio").max(5000),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
