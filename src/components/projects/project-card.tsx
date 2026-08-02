import Link from "next/link";
import { ProjectRole } from "@prisma/client";
import { Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/role-badge";
import { ProjectCardMenu } from "@/components/projects/project-card-menu";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    archived: boolean;
    _count: { members: number; bugs: number; tasks: number };
  };
  role: ProjectRole;
  pinned: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
};

export function ProjectCard({
  project,
  role,
  pinned,
  canArchive,
  canDelete,
  canDuplicate,
}: ProjectCardProps) {
  return (
    <Card className="relative h-full transition-colors hover:border-foreground/30">
      <Link
        href={`/projetos/${project.id}`}
        className="absolute inset-0 z-0"
        aria-label={project.name}
      />
      <CardHeader className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 pointer-events-none text-base">
            {pinned && <Pin className="size-3.5 fill-primary text-primary" />}
            {project.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            {project.archived && (
              <Badge variant="secondary" className="pointer-events-none">
                Arquivado
              </Badge>
            )}
            <span className="pointer-events-none">
              <RoleBadge role={role} />
            </span>
            <ProjectCardMenu
              projectId={project.id}
              name={project.name}
              description={project.description}
              archived={project.archived}
              pinned={pinned}
              canArchive={canArchive}
              canDelete={canDelete}
              canDuplicate={canDuplicate}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pointer-events-none relative z-10">
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
  );
}
