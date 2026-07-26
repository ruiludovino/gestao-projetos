"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { moveTaskToFolderAction } from "@/actions/tasks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_FOLDER = "__none__";

type Folder = { id: string; name: string };

export function TaskFolderSelect({
  taskId,
  value,
  folders,
  disabled,
}: {
  taskId: string;
  value: string | null;
  folders: Folder[];
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const items: Record<string, string> = { [NO_FOLDER]: "Sem pasta" };
  for (const folder of folders) items[folder.id] = folder.name;

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await moveTaskToFolderAction(taskId, next === NO_FOLDER ? null : next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao mover tarefa.");
      }
    });
  }

  return (
    <Select
      items={items}
      value={value ?? NO_FOLDER}
      onValueChange={handleChange}
      disabled={disabled || isPending}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_FOLDER}>Sem pasta</SelectItem>
        {folders.map((folder) => (
          <SelectItem key={folder.id} value={folder.id}>
            {folder.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
