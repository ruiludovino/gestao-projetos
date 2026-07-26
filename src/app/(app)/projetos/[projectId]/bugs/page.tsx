import Link from "next/link";
import { Plus } from "lucide-react";
import { BugStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { BugStatusBadge } from "@/components/shared/bug-status-badge";
import { AssigneeFilter } from "@/components/shared/assignee-filter";
import { ResolveBugButton } from "@/components/bugs/resolve-bug-button";
import { DeleteBugButton } from "@/components/bugs/delete-bug-button";

const RESOLVED_STATUSES: BugStatus[] = [BugStatus.RESOLVIDO, BugStatus.FECHADO];

export default async function BugsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ responsavel?: string; estado?: string }>;
}) {
  const { projectId } = await params;
  const { responsavel, estado } = await searchParams;
  const isHistory = estado === "historico";
  const session = await auth();
  const userId = session!.user.id;
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);

  const [membership, members, bugs] = await Promise.all([
    getMembership(projectId, userId),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.bug.findMany({
      where: {
        projectId,
        status: isHistory ? { in: RESOLVED_STATUSES } : { notIn: RESOLVED_STATUSES },
        ...(responsavel ? { assigneeId: responsavel } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { name: true, email: true, image: true } },
        reporter: { select: { name: true, email: true, image: true } },
        labels: { include: { label: true } },
      },
    }),
  ]);

  const toggleParams = new URLSearchParams();
  if (!isHistory) toggleParams.set("estado", "historico");
  if (responsavel) toggleParams.set("responsavel", responsavel);
  const toggleQuery = toggleParams.toString();
  const toggleHref = `/projetos/${projectId}/bugs${toggleQuery ? `?${toggleQuery}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Bugs</h1>
          <Link href={toggleHref} className="text-sm text-muted-foreground hover:underline">
            {isHistory ? "Ver ativos" : "Ver histórico"}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <AssigneeFilter members={members} />
          {canEditContent(membership.role) && !isHistory && (
            <Button
              render={
                <Link href={`/projetos/${projectId}/bugs/novo`}>
                  <Plus className="size-4" />
                  Novo bug
                </Link>
              }
            />
          )}
        </div>
      </div>

      {bugs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isHistory ? "Ainda não há bugs resolvidos." : "Ainda não há bugs reportados."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Atribuído</TableHead>
              <TableHead>Criado por</TableHead>
              {canEditContent(membership.role) && <TableHead className="w-32">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.map((bug) => {
              const assigneeLabel = bug.assignee?.name ?? bug.assignee?.email;
              const reporterLabel = bug.reporter?.name ?? bug.reporter?.email;
              return (
                <TableRow key={bug.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    BUG-{bug.number}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/projetos/${projectId}/bugs/${bug.id}`}
                      className="font-medium hover:underline"
                    >
                      {bug.title}
                    </Link>
                    {bug.labels.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {bug.labels.map(({ label }) => (
                          <span
                            key={label.id}
                            className="rounded px-1.5 py-0.5 text-xs"
                            style={{ backgroundColor: `${label.color}22`, color: label.color }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={bug.priority} />
                  </TableCell>
                  <TableCell>
                    <BugStatusBadge status={bug.status} />
                  </TableCell>
                  <TableCell>
                    {bug.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={bug.assignee.image ?? undefined} alt={assigneeLabel ?? ""} />
                          <AvatarFallback>
                            {assigneeLabel?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assigneeLabel}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={bug.reporter.image ?? undefined} alt={reporterLabel ?? ""} />
                        <AvatarFallback>{reporterLabel?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{reporterLabel}</span>
                    </div>
                  </TableCell>
                  {canEditContent(membership.role) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ResolveBugButton bugId={bug.id} isHistory={isHistory} />
                        {(isOwner || bug.reporterId === userId) && (
                          <DeleteBugButton bugId={bug.id} size="icon-sm" />
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
