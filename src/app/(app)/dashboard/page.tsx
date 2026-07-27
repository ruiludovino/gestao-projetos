import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { BugStatus, TaskStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewCredentials } from "@/lib/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { PriorityBadge } from "@/components/shared/priority-badge";

const MONTHLY_DIVISOR = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
} as const;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { role: true, project: { select: { id: true, archived: true } } },
  });

  const activeProjectIds = memberships
    .filter((m) => !m.project.archived)
    .map((m) => m.project.id);
  const credentialProjectIds = memberships
    .filter((m) => !m.project.archived && canViewCredentials(m.role))
    .map((m) => m.project.id);

  const [
    openBugsCount,
    myOpenBugsCount,
    myOpenTasksCount,
    unresolvedNotesCount,
    credentials,
    myTasks,
    recentActivity,
  ] = await Promise.all([
    prisma.bug.count({
      where: {
        projectId: { in: activeProjectIds },
        status: { in: [BugStatus.ABERTO, BugStatus.EM_PROGRESSO] },
      },
    }),
    prisma.bug.count({
      where: {
        projectId: { in: activeProjectIds },
        assigneeId: userId,
        status: { in: [BugStatus.ABERTO, BugStatus.EM_PROGRESSO] },
      },
    }),
    prisma.task.count({
      where: {
        projectId: { in: activeProjectIds },
        assigneeId: userId,
        status: { not: TaskStatus.DONE },
        parentTaskId: null,
      },
    }),
    prisma.note.count({
      where: { projectId: { in: activeProjectIds }, isResolved: false },
    }),
    prisma.credential.findMany({
      where: { projectId: { in: credentialProjectIds }, cost: { not: null } },
      select: { cost: true, billingCycle: true },
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: activeProjectIds },
        assigneeId: userId,
        status: { not: TaskStatus.DONE },
        parentTaskId: null,
      },
      orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 6,
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.activityLog.findMany({
      where: { projectId: { in: activeProjectIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true, image: true } } },
    }),
  ]);

  const monthlyCost = credentials.reduce((sum, credential) => {
    if (credential.cost == null) return sum;
    const divisor = credential.billingCycle ? MONTHLY_DIVISOR[credential.billingCycle] : 1;
    return sum + credential.cost / divisor;
  }, 0);

  const formattedMonthlyCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(monthlyCost);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="" width={44} height={44} className="rounded-xl" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo, {session?.user?.name ?? session?.user?.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumo dos teus projetos ativos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Projetos ativos" value={activeProjectIds.length} />
        <StatCard label="Bugs abertos" value={openBugsCount} />
        <StatCard label="Bugs atribuídos a mim" value={myOpenBugsCount} />
        <StatCard label="Tarefas minhas" value={myOpenTasksCount} />
        <StatCard label="Notas por resolver" value={unresolvedNotesCount} />
        <StatCard label="Custo mensal" value={formattedMonthlyCost} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-medium">As minhas tarefas</h2>
          {myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem tarefas atribuídas em aberto. 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {myTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/projetos/${task.project.id}/tarefas/${task.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-foreground/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {task.project.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {task.deadline && (
                        <span className="text-xs text-muted-foreground">
                          {format(task.deadline, "d MMM", { locale: pt })}
                        </span>
                      )}
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-medium">Atividade recente</h2>
          <ActivityFeed entries={recentActivity} />
        </div>
      </div>
    </div>
  );
}
