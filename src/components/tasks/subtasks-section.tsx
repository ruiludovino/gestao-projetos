"use client";

import { useActionState, useRef, useTransition } from "react";
import { TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import {
  createSubtaskAction,
  deleteSubtaskAction,
  toggleSubtaskDoneAction,
  type TaskFormState,
} from "@/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Subtask = { id: string; title: string; status: TaskStatus };

const initialState: TaskFormState = {};

export function SubtasksSection({
  parentTaskId,
  subtasks,
  canEdit,
}: {
  parentTaskId: string;
  subtasks: Subtask[];
  canEdit: boolean;
}) {
  const action = createSubtaskAction.bind(null, parentTaskId);
  const [, formAction, isPending] = useActionState(action, initialState);
  const [isToggling, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleToggle(subtaskId: string) {
    startTransition(async () => {
      try {
        await toggleSubtaskDoneAction(subtaskId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar subtarefa.");
      }
    });
  }

  function handleDelete(subtaskId: string) {
    startDeleteTransition(async () => {
      try {
        await deleteSubtaskAction(subtaskId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover subtarefa.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="group flex items-center justify-between gap-2">
          <label className="flex flex-1 items-center gap-2 text-sm">
            <Checkbox
              checked={subtask.status === TaskStatus.DONE}
              disabled={!canEdit || isToggling}
              onCheckedChange={() => handleToggle(subtask.id)}
            />
            <span className={subtask.status === TaskStatus.DONE ? "text-muted-foreground line-through" : ""}>
              {subtask.title}
            </span>
          </label>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100"
              disabled={isDeleting}
              aria-label="Remover subtarefa"
              onClick={() => handleDelete(subtask.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      ))}

      {canEdit && (
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="flex gap-2 pt-1"
        >
          <Input name="title" placeholder="Adicionar subtarefa..." className="h-8" />
          <Button type="submit" size="sm" variant="outline" disabled={isPending}>
            Adicionar
          </Button>
        </form>
      )}
    </div>
  );
}
