import { z } from "zod";
import { BillingCycle } from "@prisma/client";

export const createCredentialSchema = z.object({
  serviceName: z.string().min(1, "Nome do serviço obrigatório").max(120),
  url: z.string().url("URL inválido").optional().or(z.literal("")),
  username: z.string().max(200).optional().or(z.literal("")),
  password: z.string().min(1, "A password é obrigatória").max(500),
  notes: z.string().max(5000).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  cost: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Custo inválido"),
  billingCycle: z.nativeEnum(BillingCycle).optional().or(z.literal("")),
});

export const updateCredentialSchema = createCredentialSchema.extend({
  // password opcional na edicao: vazio mantem a password atual
  password: z.string().max(500).optional().or(z.literal("")),
});

export const credentialCategorySchema = z.object({
  name: z.string().min(1, "Nome da categoria obrigatório").max(60),
  color: z.string().min(1).max(20),
});
