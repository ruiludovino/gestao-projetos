import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, getCopyTargetProjects } from "@/lib/project-data";
import { canEditContent, isCurrentUserOwner } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditAppRouteDialog } from "@/components/app-routes/edit-app-route-dialog";
import { DeleteAppRouteButton } from "@/components/app-routes/delete-app-route-button";
import { CopyToProjectDialog } from "@/components/shared/copy-to-project-dialog";
import { AppRoutesSearch } from "@/components/app-routes/app-routes-search";
import { copyAppRouteToProjectAction, copyAllAppRoutesToProjectAction } from "@/actions/app-routes";

export default async function AppRoutesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { projectId } = await params;
  const { q } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, isOwner, routes, copyTargetProjects] = await Promise.all([
    getMembership(projectId, userId),
    isCurrentUserOwner(),
    prisma.appRoute.findMany({
      where: {
        projectId,
        ...(q
          ? {
              OR: [
                { description: { contains: q, mode: "insensitive" } },
                { link: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    getCopyTargetProjects(userId, projectId),
  ]);

  const canEdit = canEditContent(membership.role);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Rotas da Aplicação</h1>
        <div className="flex items-center gap-2">
          <AppRoutesSearch />
          {canEdit && routes.length > 0 && copyTargetProjects.length > 0 && (
            <CopyToProjectDialog
              projects={copyTargetProjects}
              onCopy={copyAllAppRoutesToProjectAction.bind(null, projectId)}
              triggerLabel="Copiar todas para outro projeto"
            />
          )}
          {canEdit && (
            <Button
              render={
                <Link href={`/projetos/${projectId}/rotas/nova`}>
                  <Plus className="size-4" />
                  Nova rota
                </Link>
              }
            />
          )}
        </div>
      </div>

      {routes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {q ? "Nenhuma rota encontrada para essa pesquisa." : "Ainda não há rotas registadas."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Criado por</TableHead>
              {canEdit && <TableHead className="w-20">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{route.description}</TableCell>
                <TableCell>
                  <a
                    href={route.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {route.link}
                  </a>
                </TableCell>
                <TableCell>
                  <span className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {route.notes || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {route.createdBy.name ?? route.createdBy.email}
                  </span>
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-1">
                      <EditAppRouteDialog route={route} />
                      <CopyToProjectDialog
                        projects={copyTargetProjects}
                        onCopy={copyAppRouteToProjectAction.bind(null, route.id)}
                        triggerLabel="Copiar para projeto"
                        iconOnly
                      />
                      {(isOwner || route.createdById === userId) && (
                        <DeleteAppRouteButton routeId={route.id} />
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
