"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateTaskAssigneeAction } from "@/actions/tasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNASSIGNED = "__unassigned__";

type Member = { userId: string; user: { name: string | null; email: string | null } };

export function TaskAssigneeSelect({
  taskId,
  value,
  members,
  disabled,
}: {
  taskId: string;
  value: string | null;
  members: Member[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const items: Record<string, string> = { [UNASSIGNED]: "Ninguém" };
  for (const member of members) {
    items[member.userId] = member.user.name ?? member.user.email ?? "?";
  }

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await updateTaskAssigneeAction(taskId, next === UNASSIGNED ? null : next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atribuir tarefa.");
      }
    });
  }

  return (
    <Select
      items={items}
      value={value ?? UNASSIGNED}
      onValueChange={handleChange}
      disabled={disabled || isPending}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Ninguém</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.userId} value={member.userId}>
            {member.user.name ?? member.user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
