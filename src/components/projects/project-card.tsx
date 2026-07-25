import Link from "next/link";
import { ProjectRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/role-badge";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    archived: boolean;
    _count: { members: number; bugs: number; tasks: number };
  };
  role: ProjectRole;
};

export function ProjectCard({ project, role }: ProjectCardProps) {
  return (
    <Link href={`/projetos/${project.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{project.name}</CardTitle>
            <div className="flex items-center gap-1">
              {project.archived && <Badge variant="secondary">Arquivado</Badge>}
              <RoleBadge role={role} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {project.description || "Sem descrição."}
          </p>
          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <span>{project._count.members} membros</span>
            <span>{project._count.bugs} bugs</span>
            <span>{project._count.tasks} tarefas</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
