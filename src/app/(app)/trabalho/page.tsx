import { BugStatus, TaskStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { WorkFilters } from "@/components/work/work-filters";
import { WorkItemCard, type WorkItem } from "@/components/work/work-item-card";

const COLUMNS = ["A Fazer", "Em Curso", "Concluído"] as const;

const TASK_COLUMN: Record<TaskStatus, (typeof COLUMNS)[number]> = {
  TODO: "A Fazer",
  DOING: "Em Curso",
  DONE: "Concluído",
};

const BUG_COLUMN: Record<BugStatus, (typeof COLUMNS)[number]> = {
  ABERTO: "A Fazer",
  EM_PROGRESSO: "Em Curso",
  RESOLVIDO: "Concluído",
  FECHADO: "Concluído",
};

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; tipo?: string }>;
}) {
  const { projeto, tipo } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const memberships = await prisma.projectMember.findMany({
    where: { userId, project: { archived: false } },
    select: { project: { select: { id: true, name: true } } },
    orderBy: { project: { name: "asc" } },
  });
  const allProjects = memberships.map((m) => m.project);
  const projectIds = projeto
    ? allProjects.filter((p) => p.id === projeto).map((p) => p.id)
    : allProjects.map((p) => p.id);

  const includeTasks = tipo !== "bugs";
  const includeBugs = tipo !== "tarefas";

  const [tasks, bugs] = await Promise.all([
    includeTasks
      ? prisma.task.findMany({
          where: { projectId: { in: projectIds }, assigneeId: userId, parentTaskId: null },
          include: { project: { select: { id: true, name: true } } },
          orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    includeBugs
      ? prisma.bug.findMany({
          where: { projectId: { in: projectIds }, assigneeId: userId },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const items: (WorkItem & { column: (typeof COLUMNS)[number] })[] = [
    ...tasks.map((task) => ({
      id: task.id,
      kind: "task" as const,
      number: task.number,
      title: task.title,
      priority: task.priority,
      deadline: task.deadline?.toISOString() ?? null,
      projectId: task.project.id,
      projectName: task.project.name,
      column: TASK_COLUMN[task.status],
    })),
    ...bugs.map((bug) => ({
      id: bug.id,
      kind: "bug" as const,
      number: bug.number,
      title: bug.title,
      priority: bug.priority,
      deadline: null,
      projectId: bug.project.id,
      projectName: bug.project.name,
      column: BUG_COLUMN[bug.status],
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">O Meu Trabalho</h1>
          <p className="text-sm text-muted-foreground">
            Tarefas e bugs atribuídos a ti, em todos os projetos, num só sítio.
          </p>
        </div>
        <WorkFilters projects={allProjects} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnItems = items.filter((item) => item.column === column);
          return (
            <div key={column} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-sm font-semibold">{column}</h2>
                <span className="text-xs text-muted-foreground">({columnItems.length})</span>
              </div>
              <div className="space-y-2">
                {columnItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Sem itens.
                  </p>
                ) : (
                  columnItems.map((item) => <WorkItemCard key={`${item.kind}-${item.id}`} item={item} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
