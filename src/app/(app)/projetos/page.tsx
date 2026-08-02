import Link from "next/link";
import { LayoutGrid, List, Pin, Plus } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerEmail } from "@/lib/invites";
import { canManageProject, canDeleteOwnRecord } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/shared/role-badge";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectCardMenu } from "@/components/projects/project-card-menu";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; vista?: string }>;
}) {
  const { estado, vista } = await searchParams;
  const isHistory = estado === "historico";
  const isListView = vista === "lista";
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

  const toggleParams = new URLSearchParams();
  if (!isHistory) toggleParams.set("estado", "historico");
  if (isListView) toggleParams.set("vista", "lista");
  const toggleQuery = toggleParams.toString();
  const toggleHref = `/projetos${toggleQuery ? `?${toggleQuery}` : ""}`;

  const viewHref = (view: "cards" | "lista") => {
    const params = new URLSearchParams();
    if (isHistory) params.set("estado", "historico");
    if (view === "lista") params.set("vista", "lista");
    const query = params.toString();
    return `/projetos${query ? `?${query}` : ""}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <Link href={toggleHref} className="text-sm text-muted-foreground hover:underline">
            {isHistory ? "Ver ativos" : "Ver histórico"}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Link
              href={viewHref("cards")}
              aria-label="Ver em cartões"
              className={cn(
                "rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground",
                !isListView && "bg-accent text-foreground",
              )}
            >
              <LayoutGrid className="size-4" />
            </Link>
            <Link
              href={viewHref("lista")}
              aria-label="Ver em listagem"
              className={cn(
                "rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground",
                isListView && "bg-accent text-foreground",
              )}
            >
              <List className="size-4" />
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
      ) : isListView ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-28">Membros</TableHead>
              <TableHead className="w-24">Bugs</TableHead>
              <TableHead className="w-24">Tarefas</TableHead>
              <TableHead className="w-28">Cargo</TableHead>
              <TableHead className="w-16">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map(({ project, role, pinned }) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    href={`/projetos/${project.id}`}
                    className="flex items-center gap-1.5 font-medium hover:underline"
                  >
                    {pinned && <Pin className="size-3.5 shrink-0 fill-primary text-primary" />}
                    {project.name}
                    {project.archived && <Badge variant="secondary">Arquivado</Badge>}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {project._count.members}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {project._count.bugs}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {project._count.tasks}
                </TableCell>
                <TableCell>
                  <RoleBadge role={role} />
                </TableCell>
                <TableCell>
                  <ProjectCardMenu
                    projectId={project.id}
                    name={project.name}
                    description={project.description}
                    archived={project.archived}
                    pinned={pinned}
                    canArchive={canManageProject(role)}
                    canDelete={
                      canManageProject(role) &&
                      canDeleteOwnRecord({ isOwner, creatorId: project.createdById, userId })
                    }
                    canDuplicate={isOwner}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ project, role, pinned }) => (
            <ProjectCard
              key={project.id}
              project={project}
              role={role}
              pinned={pinned}
              canArchive={canManageProject(role)}
              canDelete={
                canManageProject(role) &&
                canDeleteOwnRecord({ isOwner, creatorId: project.createdById, userId })
              }
              canDuplicate={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}
