import { z } from "zod";

export const createCredentialSchema = z.object({
  serviceName: z.string().min(1, "Nome do serviço obrigatório").max(120),
  url: z.string().url("URL inválido").optional().or(z.literal("")),
  username: z.string().max(200).optional().or(z.literal("")),
  password: z.string().min(1, "A password é obrigatória").max(500),
  notes: z.string().max(5000).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
});

export const updateCredentialSchema = createCredentialSchema.extend({
  // password opcional na edicao: vazio mantem a password atual
  password: z.string().max(500).optional().or(z.literal("")),
});
