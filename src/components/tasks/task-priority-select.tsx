"use client";

import { useTransition } from "react";
import { Priority } from "@prisma/client";
import { toast } from "sonner";

import { updateTaskPriorityAction } from "@/actions/tasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS } from "@/components/shared/priority-badge";

export function TaskPrioritySelect({
  taskId,
  value,
  disabled,
}: {
  taskId: string;
  value: Priority;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await updateTaskPriorityAction(taskId, next as Priority);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar prioridade.");
      }
    });
  }

  return (
    <Select
      items={PRIORITY_LABELS}
      value={value}
      onValueChange={handleChange}
      disabled={disabled || isPending}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(Priority).map((priority) => (
          <SelectItem key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
