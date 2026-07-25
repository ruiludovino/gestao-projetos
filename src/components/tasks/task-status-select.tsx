"use client";

import { useTransition } from "react";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";

import { setTaskStatusAction } from "@/actions/tasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_LABELS } from "@/components/shared/task-status-badge";

export function TaskStatusSelect({
  taskId,
  value,
  disabled,
}: {
  taskId: string;
  value: TaskStatus;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await setTaskStatusAction(taskId, next as TaskStatus);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar estado.");
      }
    });
  }

  return (
    <Select
      items={TASK_STATUS_LABELS}
      value={value}
      onValueChange={handleChange}
      disabled={disabled || isPending}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(TaskStatus).map((status) => (
          <SelectItem key={status} value={status}>
            {TASK_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
