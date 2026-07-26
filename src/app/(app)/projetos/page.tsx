import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerEmail } from "@/lib/invites";
import { canManageProject, canDeleteOwnRecord } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const isHistory = estado === "historico";
  const session = await auth();
  const userId = session!.user.id;
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);

  const memberships = await prisma.projectMember.findMany({
    where: { userId, project: { archived: isHistory } },
    include: {
      project: {
        include: { _count: { select: { members: true, bugs: true, tasks: true } } },
      },
    },
    orderBy: { project: { updatedAt: "desc" } },
  });

  const toggleHref = isHistory ? "/projetos" : "/projetos?estado=historico";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <Link href={toggleHref} className="text-sm text-muted-foreground hover:underline">
            {isHistory ? "Ver ativos" : "Ver histórico"}
          </Link>
        </div>
        {isOwner && !isHistory && (
          <Button
            render={
              <Link href="/projetos/novo">
                <Plus className="size-4" />
                Novo projeto
              </Link>
            }
          />
        )}
      </div>

      {memberships.length === 0 ? (
        <p className="text-muted-foreground">
          {isHistory ? (
            "Ainda não há projetos no histórico."
          ) : isOwner ? (
            <>
              Ainda não pertences a nenhum projeto.{" "}
              <Link href="/projetos/novo" className="underline underline-offset-4">
                Cria o primeiro
              </Link>
              .
            </>
          ) : (
            "Ainda não pertences a nenhum projeto. Pede a um admin de um projeto para te convidar."
          )}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ project, role }) => (
            <ProjectCard
              key={project.id}
              project={project}
              role={role}
              canArchive={canManageProject(role)}
              canDelete={
                canManageProject(role) &&
                canDeleteOwnRecord({ isOwner, creatorId: project.createdById, userId })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
