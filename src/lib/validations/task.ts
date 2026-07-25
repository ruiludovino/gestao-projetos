import { z } from "zod";
import { Priority, TaskStatus } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z.string().min(2, "O título tem de ter pelo menos 2 caracteres").max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
  priority: z.nativeEnum(Priority),
  assigneeId: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
});

export const taskStatusSchema = z.nativeEnum(TaskStatus);

export const subtaskSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
});

export const githubLinkSchema = z.object({
  url: z
    .string()
    .url()
    .regex(
      /github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+/,
      "Cola um URL de issue ou pull request do GitHub",
    ),
});
