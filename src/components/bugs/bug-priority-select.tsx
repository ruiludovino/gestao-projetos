"use client";

import { useTransition } from "react";
import { Priority } from "@prisma/client";
import { toast } from "sonner";

import { updateBugPriorityAction } from "@/actions/bugs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABELS: Record<Priority, string> = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export function BugPrioritySelect({
  bugId,
  value,
  disabled,
}: {
  bugId: string;
  value: Priority;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await updateBugPriorityAction(bugId, next as Priority);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar prioridade.");
      }
    });
  }

  return (
    <Select items={LABELS} value={value} onValueChange={handleChange} disabled={disabled || isPending}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(Priority).map((priority) => (
          <SelectItem key={priority} value={priority}>
            {LABELS[priority]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
