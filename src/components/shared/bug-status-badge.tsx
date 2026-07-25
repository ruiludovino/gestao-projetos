import { BugStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  ABERTO: "Aberto",
  EM_PROGRESSO: "Em progresso",
  RESOLVIDO: "Resolvido",
  FECHADO: "Fechado",
};

const LABELS = BUG_STATUS_LABELS;

const CLASSES: Record<BugStatus, string> = {
  ABERTO: "bg-red-500/15 text-red-600 dark:text-red-400",
  EM_PROGRESSO: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  RESOLVIDO: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  FECHADO: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function BugStatusBadge({ status }: { status: BugStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", CLASSES[status])}>
      {LABELS[status]}
    </Badge>
  );
}
