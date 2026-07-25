import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { GitCommit } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listGithubCommits } from "@/lib/github";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityFeed } from "@/components/shared/activity-feed";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();

  const [counts, recentActivity, firstRepo] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: {
        _count: { select: { members: true, bugs: true, tasks: true, notes: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true, image: true } } },
    }),
    prisma.githubRepo.findFirst({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  const commits =
    firstRepo && session?.githubAccessToken
      ? await listGithubCommits(session.githubAccessToken, firstRepo.owner, firstRepo.name).catch(
          () => null,
        )
      : null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Membros" value={counts._count.members} />
        <StatCard label="Bugs" value={counts._count.bugs} />
        <StatCard label="Tarefas" value={counts._count.tasks} />
        <StatCard label="Notas" value={counts._count.notes} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-medium">Atividade recente</h2>
          <ActivityFeed entries={recentActivity} />
        </div>

        {firstRepo && (
          <div>
            <h2 className="mb-4 flex items-center gap-1.5 text-lg font-medium">
              <GitCommit className="size-4" />
              Commits recentes
            </h2>
            {!session?.githubAccessToken ? (
              <p className="text-sm text-muted-foreground">
                Faz login com GitHub para ver commits em tempo real.
              </p>
            ) : !commits ? (
              <p className="text-sm text-muted-foreground">Não foi possível obter commits.</p>
            ) : commits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem commits recentes.</p>
            ) : (
              <ul className="space-y-2">
                {commits.slice(0, 5).map((commit) => (
                  <li key={commit.sha} className="text-sm">
                    <a
                      href={commit.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {commit.commit.message.split("\n")[0]}
                    </a>
                    {commit.commit.author && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {commit.commit.author.name},{" "}
                        {formatDistanceToNow(new Date(commit.commit.author.date), {
                          addSuffix: true,
                          locale: pt,
                        })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/projetos/${projectId}/github`}
              className="mt-3 inline-block text-sm text-muted-foreground hover:underline"
            >
              Ver mais no GitHub →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
