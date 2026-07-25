import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
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
import { TaskStatusBadge } from "@/components/shared/task-status-badge";
import { AssigneeFilter } from "@/components/shared/assignee-filter";

export default async function TasksListPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ responsavel?: string }>;
}) {
  const { projectId } = await params;
  const { responsavel } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, members, tasks] = await Promise.all([
    getMembership(projectId, userId),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.task.findMany({
      where: { projectId, parentTaskId: null, ...(responsavel ? { assigneeId: responsavel } : {}) },
      orderBy: [{ status: "asc" }, { position: "asc" }],
      include: {
        assignee: { select: { name: true, email: true, image: true } },
        createdBy: { select: { name: true, email: true, image: true } },
      },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Tarefas</h1>
          <Link
            href={`/projetos/${projectId}/tarefas`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Ver como kanban
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <AssigneeFilter members={members} />
          {canEditContent(membership.role) && (
            <Button
              render={
                <Link href={`/projetos/${projectId}/tarefas/novo`}>
                  <Plus className="size-4" />
                  Nova tarefa
                </Link>
              }
            />
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há tarefas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Atribuído</TableHead>
              <TableHead>Criado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const assigneeLabel = task.assignee?.name ?? task.assignee?.email;
              const creatorLabel = task.createdBy?.name ?? task.createdBy?.email;
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    TASK-{task.number}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/projetos/${projectId}/tarefas/${task.id}`}
                      className="font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={task.priority} />
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.deadline ? format(task.deadline, "d MMM yyyy", { locale: pt }) : "—"}
                  </TableCell>
                  <TableCell>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={task.assignee.image ?? undefined} alt={assigneeLabel ?? ""} />
                          <AvatarFallback>{assigneeLabel?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assigneeLabel}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.createdBy ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={task.createdBy.image ?? undefined} alt={creatorLabel ?? ""} />
                          <AvatarFallback>{creatorLabel?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{creatorLabel}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
