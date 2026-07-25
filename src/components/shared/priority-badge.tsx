import { Priority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const PRIORITY_LABELS: Record<Priority, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

const LABELS = PRIORITY_LABELS;

const CLASSES: Record<Priority, string> = {
  CRITICA: "bg-red-500/15 text-red-600 dark:text-red-400",
  ALTA: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  MEDIA: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  BAIXA: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", CLASSES[priority])}>
      {LABELS[priority]}
    </Badge>
  );
}
