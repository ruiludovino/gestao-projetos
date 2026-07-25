"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateTaskDeadlineAction } from "@/actions/tasks";
import { Input } from "@/components/ui/input";

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function TaskDeadlinePicker({
  taskId,
  value,
  disabled,
}: {
  taskId: string;
  value: string | null;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value || null;
    startTransition(async () => {
      try {
        await updateTaskDeadlineAction(taskId, next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar deadline.");
      }
    });
  }

  return (
    <Input
      type="date"
      defaultValue={toDateInputValue(value)}
      onChange={handleChange}
      disabled={disabled || isPending}
      className="w-40"
    />
  );
}
