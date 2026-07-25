"use server";

import { revalidatePath } from "next/cache";
import { ProjectRole } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { requireProjectRole } from "@/lib/permissions";
import { verifyGithubRepo } from "@/lib/github";
import { connectRepoSchema, parseOwnerRepo } from "@/lib/validations/github";

export type GithubFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function connectRepoAction(
  projectId: string,
  _prevState: GithubFormState,
  formData: FormData,
): Promise<GithubFormState> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  await requireProjectRole(session.user.id, projectId, [ProjectRole.ADMIN, ProjectRole.DEVELOPER]);

  if (!session.githubAccessToken) {
    return {
      error:
        "Precisas de ter feito login com GitHub (com acesso a repositórios) para ligar um repositório.",
    };
  }

  const parsed = connectRepoSchema.safeParse({ repo: formData.get("repo") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { owner, name } = parseOwnerRepo(parsed.data.repo);

  try {
    await verifyGithubRepo(session.githubAccessToken, owner, name);
  } catch {
    return { error: `Não foi possível aceder a ${owner}/${name}. Verifica o nome e as permissões.` };
  }

  const fullName = `${owner}/${name}`;
  const existing = await prisma.githubRepo.findUnique({
    where: { projectId_fullName: { projectId, fullName } },
  });
  if (existing) {
    return { error: "Este repositório já está ligado ao projeto." };
  }

  await prisma.githubRepo.create({
    data: { projectId, owner, name, fullName, connectedById: session.user.id },
  });

  await logActivity({
    projectId,
    userId: session.user.id,
    action: "github.repo_ligado",
    entityType: "project",
    entityId: projectId,
    metadata: { fullName },
  });

  revalidatePath(`/projetos/${projectId}/github`);
  return {};
}

export async function disconnectRepoAction(repoId: string) {
  const repo = await prisma.githubRepo.findUniqueOrThrow({ where: { id: repoId } });
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  await requireProjectRole(session.user.id, repo.projectId, [
    ProjectRole.ADMIN,
    ProjectRole.DEVELOPER,
  ]);

  await prisma.githubRepo.delete({ where: { id: repoId } });

  revalidatePath(`/projetos/${repo.projectId}/github`);
}
