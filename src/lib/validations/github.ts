import { z } from "zod";

export const connectRepoSchema = z.object({
  repo: z
    .string()
    .min(3, "Indica o repositório")
    .regex(
      /^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/,
      "Usa o formato owner/repo ou o URL completo do GitHub",
    ),
});

export function parseOwnerRepo(input: string): { owner: string; name: string } {
  const match = input.match(/^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error("Formato inválido.");
  return { owner: match[1], name: match[2] };
}
