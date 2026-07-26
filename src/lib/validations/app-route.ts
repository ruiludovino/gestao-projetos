import { z } from "zod";

export const createAppRouteSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória").max(200),
  link: z.string().min(1, "Link obrigatório").max(500),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const updateAppRouteSchema = createAppRouteSchema;
