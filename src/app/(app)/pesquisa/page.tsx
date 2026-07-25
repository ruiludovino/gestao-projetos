import Link from "next/link";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GlobalSearchInput } from "@/components/search/global-search-input";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { BugStatusBadge } from "@/components/shared/bug-status-badge";
import { TaskStatusBadge } from "@/components/shared/task-status-badge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const projectIds = (
    await prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } })
  ).map((m) => m.projectId);

  const hasQuery = !!q && q.trim().length > 0;

  const [projects, bugs, tasks, notes] = hasQuery
    ? await Promise.all([
        prisma.project.findMany({
          where: { id: { in: projectIds }, name: { contains: q, mode: "insensitive" } },
        }),
        prisma.bug.findMany({
          where: {
            projectId: { in: projectIds },
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { project: { select: { name: true } } },
          take: 20,
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { project: { select: { name: true } } },
          take: 20,
        }),
        prisma.note.findMany({
          where: {
            projectId: { in: projectIds },
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { project: { select: { name: true } } },
          take: 20,
        }),
      ])
    : [[], [], [], []];

  const noResults =
    hasQuery && projects.length === 0 && bugs.length === 0 && tasks.length === 0 && notes.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-semibold tracking-tight">Pesquisa</h1>
        <GlobalSearchInput />
      </div>

      {noResults && <p className="text-sm text-muted-foreground">Sem resultados para “{q}”.</p>}

      {projects.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Projetos</h2>
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projetos/${project.id}`} className="text-sm hover:underline">
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bugs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Bugs</h2>
          <ul className="space-y-2">
            {bugs.map((bug) => (
              <li key={bug.id} className="flex items-center gap-2 text-sm">
                <PriorityBadge priority={bug.priority} />
                <BugStatusBadge status={bug.status} />
                <Link href={`/projetos/${bug.projectId}/bugs/${bug.id}`} className="hover:underline">
                  {bug.title}
                </Link>
                <span className="text-xs text-muted-foreground">{bug.project.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tasks.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Tarefas</h2>
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <PriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} />
                <Link
                  href={`/projetos/${task.projectId}/tarefas/${task.id}`}
                  className="hover:underline"
                >
                  {task.title}
                </Link>
                <span className="text-xs text-muted-foreground">{task.project.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Notas</h2>
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center gap-2 text-sm">
                <Link href={`/projetos/${note.projectId}/notas/${note.id}`} className="hover:underline">
                  {note.title}
                </Link>
                <span className="text-xs text-muted-foreground">{note.project.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
