import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/stat-card";
import { ActivityFeed } from "@/components/shared/activity-feed";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [counts, recentActivity] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Membros" value={counts._count.members} />
        <StatCard label="Bugs" value={counts._count.bugs} />
        <StatCard label="Tarefas" value={counts._count.tasks} />
        <StatCard label="Notas" value={counts._count.notes} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Atividade recente</h2>
        <ActivityFeed entries={recentActivity} />
      </div>
    </div>
  );
}
