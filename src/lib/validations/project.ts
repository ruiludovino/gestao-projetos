import { z } from "zod";
import { ProjectRole } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z.string().min(2, "O nome tem de ter pelo menos 2 caracteres").max(80),
  description: z.string().max(500).optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema;

export const addMemberSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.nativeEnum(ProjectRole),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectRole),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
