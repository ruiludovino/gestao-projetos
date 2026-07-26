import { z } from "zod";

export const createRuleSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(200),
  content: z.string().max(50000).optional().or(z.literal("")),
});

export const updateRuleSchema = createRuleSchema;
