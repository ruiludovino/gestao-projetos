import { ProjectRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const ROLE_LABELS: Record<ProjectRole, string> = {
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  VIEWER: "Viewer",
};

const ROLE_CLASSES: Record<ProjectRole, string> = {
  ADMIN: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DEVELOPER: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  VIEWER: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function RoleBadge({ role }: { role: ProjectRole }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", ROLE_CLASSES[role])}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
